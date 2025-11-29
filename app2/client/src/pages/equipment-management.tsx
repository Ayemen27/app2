import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Wrench, Truck, PenTool, Settings, Eye, MapPin, Calendar, DollarSign, Activity, MoreVertical, Edit, Trash2, Image, X, Heart, FileSpreadsheet, FileText, Printer, Download, BarChart3, History } from "lucide-react";
import { UnifiedSearchFilter, EQUIPMENT_STATUS_OPTIONS, type FilterConfig } from "@/components/ui/unified-search-filter";
import { StatsCard, StatsGrid } from "@/components/ui/stats-card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { AddEquipmentDialog } from "@/components/equipment/add-equipment-dialog";
import { TransferEquipmentDialog } from "@/components/equipment/transfer-equipment-dialog";
import { EquipmentMovementHistoryDialog } from "@/components/equipment/equipment-movement-history-dialog";
import type { Tool as Equipment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import { saveAs } from 'file-saver';
import { useToast } from "@/hooks/use-toast";
import { EXCEL_STYLES, COMPANY_INFO, addReportHeader } from "@/components/excel-export-utils";

export function EquipmentManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showMovementHistoryDialog, setShowMovementHistoryDialog] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  
  // States for Equipment Reports Section
  const [showReportsSection, setShowReportsSection] = useState(false);
  const [reportProjectFilter, setReportProjectFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [reportTypeFilter, setReportTypeFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const { toast } = useToast();

  // تعيين إجراء الزر العائم لإضافة معدة جديدة
  useEffect(() => {
    const handleAddEquipment = () => setShowAddDialog(true);
    setFloatingAction(handleAddEquipment, "إضافة معدة جديدة");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // جلب المعدات مع الفلاتر - محسن للأداء الفائق والسرعة
  const { data: equipment = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['equipment', searchTerm, statusFilter, typeFilter, projectFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('searchTerm', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (projectFilter !== 'all' && projectFilter !== 'warehouse') {
        params.append('projectId', projectFilter);
      } else if (projectFilter === 'warehouse') {
        params.append('projectId', '');
      }
      
      const response = await fetch(`/api/equipment?${params}`);
      if (!response.ok) throw new Error('فشل في جلب المعدات');
      return response.json();
    },
    // تحسين أداء فائق مع Cache محلي
    staleTime: 30 * 60 * 1000, // البيانات طازجة لـ 30 دقيقة!
    gcTime: 2 * 60 * 60 * 1000, // الاحتفاظ بالبيانات لـ 2 ساعة
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 0, // بدون إعادة محاولة - سرعة قصوى
    enabled: true
  });

  // جلب المشاريع لقائمة الفلاتر - محسن للأداء العالي
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiRequest('/api/projects', 'GET');
      return response;
    },
    staleTime: 15 * 60 * 1000, // البيانات طازجة لـ 15 دقيقة
    gcTime: 60 * 60 * 1000, // الاحتفاظ بالبيانات لـ 60 دقيقة
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 1000,
  });

  const equipmentFilterConfigs: FilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: 'الحالة',
      placeholder: 'اختر الحالة',
      options: EQUIPMENT_STATUS_OPTIONS,
      defaultValue: 'all',
    },
    {
      key: 'type',
      label: 'الفئة',
      placeholder: 'اختر الفئة',
      options: [
        { value: 'all', label: 'جميع الفئات' },
        { value: 'أدوات كهربائية', label: 'أدوات كهربائية' },
        { value: 'أدوات يدوية', label: 'أدوات يدوية' },
        { value: 'أدوات قياس', label: 'أدوات قياس' },
        { value: 'معدات لحام', label: 'معدات لحام' },
        { value: 'معدات حفر', label: 'معدات حفر' },
        { value: 'معدات قطع', label: 'معدات قطع' },
        { value: 'أدوات ربط', label: 'أدوات ربط' },
        { value: 'مواد كهربائية', label: 'مواد كهربائية' },
        { value: 'معدات أمان', label: 'معدات أمان' },
        { value: 'أدوات نقل', label: 'أدوات نقل' },
      ],
      defaultValue: 'all',
    },
    {
      key: 'project',
      label: 'المشروع',
      placeholder: 'اختر المشروع',
      options: [
        { value: 'all', label: 'جميع المواقع' },
        { value: 'warehouse', label: 'المستودع' },
        ...(Array.isArray(projects) ? projects.map((project: any) => ({
          value: project.id,
          label: project.name,
        })) : []),
      ],
      defaultValue: 'all',
    },
  ], [projects]);

  const handleEquipmentClick = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowEquipmentModal(true);
  };

  const handleTransferClick = (item: Equipment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedEquipment(item);
    setShowTransferDialog(true);
  };

  const handleEditClick = (item: Equipment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedEquipment(item);
    setShowDetailsDialog(true);
  };

  const handleMovementHistoryClick = (item: Equipment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedEquipment(item);
    setShowMovementHistoryDialog(true);
  };

  // Mutation للحذف
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/equipment/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.refetchQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'equipment'
      });
      toast({
        title: "تم حذف المعدة بنجاح",
        description: "تم حذف المعدة من النظام نهائياً"
      });
      setShowEquipmentModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في حذف المعدة", 
        description: error.message || "حدث خطأ أثناء حذف المعدة",
        variant: "destructive"
      });
    }
  });

  const handleDeleteClick = (item: Equipment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (confirm(`هل أنت متأكد من حذف المعدة "${item.name}" نهائياً؟\n\nلا يمكن التراجع عن هذا الإجراء.`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'active': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'maintenance': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'out_of_service': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'inactive': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getStatusBorderColor = (status: string) => {
    const colors = {
      'active': 'border-r-green-500 bg-gradient-to-r from-green-50 to-white dark:from-green-950 dark:to-gray-900',
      'maintenance': 'border-r-yellow-500 bg-gradient-to-r from-yellow-50 to-white dark:from-yellow-950 dark:to-gray-900',
      'out_of_service': 'border-r-red-500 bg-gradient-to-r from-red-50 to-white dark:from-red-950 dark:to-gray-900',
      'inactive': 'border-r-gray-500 bg-gradient-to-r from-gray-50 to-white dark:from-gray-950 dark:to-gray-900'
    };
    return colors[status as keyof typeof colors] || 'border-r-blue-500';
  };

  const getTypeBackgroundColor = (type: string | null) => {
    const colors = {
      // أدوات الملحمين للألواح الشمسية
      'أدوات': 'bg-gradient-to-br from-red-500 to-red-600',
      'أمتار': 'bg-gradient-to-br from-blue-500 to-blue-600',
      'مطارق': 'bg-gradient-to-br from-gray-700 to-gray-800',
      'مكينة لحام': 'bg-gradient-to-br from-orange-500 to-orange-600',
      'جلخ كهربائي': 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      'دريل': 'bg-gradient-to-br from-green-500 to-green-600',
      'تخزيق': 'bg-gradient-to-br from-purple-500 to-purple-600',
      'بانات': 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      'مفاتيح': 'bg-gradient-to-br from-pink-500 to-pink-600',
      'أسلاك': 'bg-gradient-to-br from-cyan-500 to-cyan-600',
      'دساميس': 'bg-gradient-to-br from-teal-500 to-teal-600',
      // القيم القديمة للتوافق
      'إنشائية': 'bg-gradient-to-br from-blue-500 to-blue-600',
      'نقل': 'bg-gradient-to-br from-green-500 to-green-600',
      'أداة': 'bg-gradient-to-br from-purple-500 to-purple-600',
      'construction': 'bg-gradient-to-br from-blue-500 to-blue-600',
      'transport': 'bg-gradient-to-br from-green-500 to-green-600',
      'tool': 'bg-gradient-to-br from-purple-500 to-purple-600'
    };
    return colors[type as keyof typeof colors] || 'bg-gradient-to-br from-gray-500 to-gray-600';
  };

  const getStatusText = (status: string) => {
    const texts = {
      'active': 'نشط',
      'maintenance': 'صيانة',
      'out_of_service': 'خارج الخدمة',
      'inactive': 'غير نشط'
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getTypeIcon = (type: string | null) => {
    const icons = {
      // أدوات الملحمين للألواح الشمسية
      'أدوات': '🔧',
      'أمتار': '📏',
      'مطارق': '🔨',
      'مكينة لحام': '⚡',
      'جلخ كهربائي': '⚙️',
      'دريل': '🔩',
      'تخزيق': '✂️',
      'بانات': '🔗',
      'مفاتيح': '🔑',
      'أسلاك': '🔌',
      'دساميس': '📎',
      // القيم القديمة للتوافق
      'construction': <Wrench className="h-5 w-5" />,
      'transport': <Truck className="h-5 w-5" />,
      'tool': <PenTool className="h-5 w-5" />,
      'إنشائية': <Wrench className="h-5 w-5" />,
      'نقل': <Truck className="h-5 w-5" />,
      'أداة': <PenTool className="h-5 w-5" />
    };
    return icons[type as keyof typeof icons] || <Wrench className="h-5 w-5" />;
  };

  // Functions for Equipment Reports
  const getFilteredEquipmentForReport = () => {
    if (!Array.isArray(equipment)) return [];
    return equipment.filter((item: Equipment) => {
      const matchesProject = reportProjectFilter === "all" || 
        (reportProjectFilter === "warehouse" && !item.currentProjectId) ||
        item.currentProjectId === reportProjectFilter;
      
      const matchesStatus = reportStatusFilter === "all" || item.status === reportStatusFilter;
      const matchesType = reportTypeFilter === "all" || item.type === reportTypeFilter;
      
      return matchesProject && matchesStatus && matchesType;
    });
  };

  const exportEquipmentToExcel = async () => {
    const filteredEquipment = getFilteredEquipmentForReport();
    
    if (filteredEquipment.length === 0) {
      toast({
        title: "لا توجد معدات للتصدير",
        description: "يرجى التأكد من الفلاتر المحددة",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExporting(true);
      
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      // إعداد معلومات المصنف
      workbook.creator = COMPANY_INFO.name;
      workbook.lastModifiedBy = 'نظام إدارة المعدات';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      const worksheet = workbook.addWorksheet('كشف المعدات');
      
      // Set RTL direction
      worksheet.views = [{ rightToLeft: true }];
      
      // إضافة رأس التقرير الاحترافي
      const reportProjectName = reportProjectFilter === "all" ? "جميع المشاريع" : 
                                reportProjectFilter === "warehouse" ? "المستودع" :
                                (Array.isArray(projects) ? projects.find((p: any) => p.id === reportProjectFilter)?.name : undefined) || "مشروع محدد";
      
      let currentRow = addReportHeader(
        worksheet,
        'كشف المعدات التفصيلي',
        `المشروع: ${reportProjectName}`,
        [
          `تاريخ الإصدار: ${formatDate(new Date().toISOString().split('T')[0])}`,
          `إجمالي المعدات: ${filteredEquipment.length}`,
          `المعدات النشطة: ${filteredEquipment.filter((e: Equipment) => e.status === 'active').length}`,
          `في الصيانة: ${filteredEquipment.filter((e: Equipment) => e.status === 'maintenance').length}`
        ]
      );
      
      // إضافة رأس الجدول
      const headers = ['الكود', 'اسم المعدة', 'الفئة', 'الحالة', 'الموقع', 'سعر الشراء', 'تاريخ الشراء', 'الوصف'];
      const headerRow = worksheet.addRow(headers);
      
      headers.forEach((_, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.font = EXCEL_STYLES.fonts.header;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.colors.headerBg } };
        cell.border = {
          top: EXCEL_STYLES.borders.medium,
          bottom: EXCEL_STYLES.borders.medium,
          left: EXCEL_STYLES.borders.thin,
          right: EXCEL_STYLES.borders.thin
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      
      // تحديد عرض الأعمدة
      worksheet.getColumn(1).width = 15; // الكود
      worksheet.getColumn(2).width = 25; // اسم المعدة
      worksheet.getColumn(3).width = 15; // الفئة
      worksheet.getColumn(4).width = 15; // الحالة
      worksheet.getColumn(5).width = 25; // الموقع
      worksheet.getColumn(6).width = 18; // سعر الشراء
      worksheet.getColumn(7).width = 15; // تاريخ الشراء
      worksheet.getColumn(8).width = 30; // الوصف
      
      currentRow++;

      // إضافة بيانات المعدات
      filteredEquipment.forEach((item: Equipment, index: number) => {
        const projectName = item.currentProjectId 
          ? (Array.isArray(projects) ? projects.find((p: any) => p.id === item.currentProjectId)?.name : undefined) || 'مشروع غير معروف'
          : 'المستودع';
        
        const row = worksheet.addRow([
          item.code,
          item.name,
          item.type || 'غير محدد',
          getStatusText(item.status),
          projectName,
          item.purchasePrice ? formatCurrency(Number(item.purchasePrice)) : 'غير محدد',
          item.purchaseDate ? formatDate(item.purchaseDate) : 'غير محدد',
          item.description || 'غير محدد'
        ]);
        
        // تنسيق الصفوف
        row.eachCell((cell, colNumber) => {
          cell.font = EXCEL_STYLES.fonts.data;
          cell.border = {
            top: EXCEL_STYLES.borders.thin,
            bottom: EXCEL_STYLES.borders.thin,
            left: EXCEL_STYLES.borders.thin,
            right: EXCEL_STYLES.borders.thin
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          
          // تنسيق خاص لعمود السعر
          if (colNumber === 6 && item.purchasePrice) {
            cell.numFmt = '#,##0 "ريال"';
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
          
          // تنسيق خاص للوصف
          if (colNumber === 8) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          }
          
          // ألوان متناوبة للصفوف
          if ((index as number) % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          }
        });
        currentRow++;
      });

      // إضافة ملخص المعدات
      currentRow += 2;
      worksheet.addRow([]);
      currentRow++;
      
      // رأس الملخص
      const summaryTitleRow = worksheet.addRow(['ملخص المعدات']);
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const summaryTitleCell = summaryTitleRow.getCell(1);
      summaryTitleCell.font = { ...EXCEL_STYLES.fonts.title, size: 14 };
      summaryTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      summaryTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.colors.totalsBg } };
      summaryTitleCell.border = {
        top: EXCEL_STYLES.borders.medium,
        bottom: EXCEL_STYLES.borders.medium,
        left: EXCEL_STYLES.borders.medium,
        right: EXCEL_STYLES.borders.medium
      };
      currentRow++;
      
      // بيانات الملخص
      const summaryData = [
        ['إجمالي المعدات', filteredEquipment.length],
        ['المعدات النشطة', filteredEquipment.filter((e: Equipment) => e.status === 'active').length],
        ['في الصيانة', filteredEquipment.filter((e: Equipment) => e.status === 'maintenance').length],
        ['خارج الخدمة', filteredEquipment.filter((e: Equipment) => e.status === 'out_of_service').length],
        ['غير نشطة', filteredEquipment.filter((e: Equipment) => e.status === 'inactive').length]
      ];
      
      summaryData.forEach(([label, value]) => {
        const row = worksheet.addRow([label, '', '', '', '', '', '', value]);
        const labelCell = row.getCell(1);
        const valueCell = row.getCell(8);
        
        labelCell.font = EXCEL_STYLES.fonts.totals;
        valueCell.font = EXCEL_STYLES.fonts.totals;
        
        [labelCell, valueCell].forEach(cell => {
          cell.border = {
            top: EXCEL_STYLES.borders.thin,
            bottom: EXCEL_STYLES.borders.thin,
            left: EXCEL_STYLES.borders.thin,
            right: EXCEL_STYLES.borders.thin
          };
        });
        
        labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
        valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
        currentRow++;
      });
      
      // إضافة ذيل التقرير
      currentRow += 2;
      worksheet.addRow([]);
      currentRow++;
      
      const footerRow = worksheet.addRow([
        `تم إنشاء هذا التقرير بواسطة ${COMPANY_INFO.name} - ${formatDate(new Date().toISOString().split('T')[0])}`
      ]);
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const footerCell = footerRow.getCell(1);
      footerCell.font = EXCEL_STYLES.fonts.footer;
      footerCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Generate filename
      const filenameProjectName = reportProjectFilter === "all" ? "جميع_المشاريع" : 
                                  reportProjectFilter === "warehouse" ? "المستودع" :
                                  (Array.isArray(projects) ? projects.find((p: any) => p.id === reportProjectFilter)?.name : undefined)?.replace(/\s/g, '_') || "مشروع_محدد";
      
      const filename = `كشف_المعدات_${filenameProjectName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Save file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, filename);
      
      toast({
        title: "تم تصدير كشف المعدات بنجاح",
        description: `تم حفظ الملف: ${filename}`
      });
      
    } catch (error) {
      console.error('خطأ في تصدير Excel:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير كشف المعدات",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportEquipmentToPDF = async () => {
    const filteredEquipment = getFilteredEquipmentForReport();
    
    if (filteredEquipment.length === 0) {
      toast({
        title: "لا توجد معدات للتصدير",
        description: "يرجى التأكد من الفلاتر المحددة",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExporting(true);
      
      // Create print content
      const pdfProjectName = reportProjectFilter === "all" ? "جميع المشاريع" : 
                             reportProjectFilter === "warehouse" ? "المستودع" :
                             (Array.isArray(projects) ? projects.find((p: any) => p.id === reportProjectFilter)?.name : undefined) || "مشروع محدد";
      
      const printContent = `
        <html dir="rtl">
          <head>
            <meta charset="UTF-8">
            <title>كشف المعدات - ${pdfProjectName}</title>
            <style>
              @page {
                margin: 2cm 1.5cm;
                size: A4;
              }
              body { 
                font-family: 'Arial', sans-serif; 
                margin: 0; 
                padding: 0; 
                direction: rtl; 
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                color: #1e293b;
                line-height: 1.6;
              }
              
              /* رأس احترافي */
              .company-header {
                background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                color: white;
                padding: 25px;
                text-align: center;
                border-radius: 12px;
                margin-bottom: 30px;
                box-shadow: 0 8px 25px rgba(30, 64, 175, 0.3);
              }
              .company-name {
                font-size: 24px;
                font-weight: bold;
                margin: 0 0 10px 0;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
              }
              .company-subtitle {
                font-size: 14px;
                opacity: 0.9;
                margin: 0;
              }
              
              /* عنوان التقرير */
              .report-header {
                background: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                margin-bottom: 25px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                border-left: 6px solid #3b82f6;
              }
              .report-title {
                font-size: 22px;
                color: #1e293b;
                margin: 0 0 15px 0;
                font-weight: bold;
              }
              
              /* معلومات التقرير */
              .report-info {
                display: flex;
                justify-content: space-around;
                background: #f8fafc;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 25px;
                border: 1px solid #e2e8f0;
              }
              .info-item {
                text-align: center;
                color: #475569;
                font-weight: 600;
              }
              .info-label {
                display: block;
                font-size: 12px;
                color: #64748b;
                margin-bottom: 5px;
              }
              .info-value {
                display: block;
                font-size: 16px;
                color: #1e293b;
                font-weight: bold;
              }
              
              /* الجدول */
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 25px;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
              }
              th {
                background: linear-gradient(135deg, #334155 0%, #475569 100%);
                color: white;
                padding: 15px 10px;
                text-align: center;
                font-weight: bold;
                font-size: 13px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2);
              }
              td {
                padding: 12px 8px;
                text-align: center;
                border-bottom: 1px solid #e2e8f0;
                font-size: 12px;
                vertical-align: middle;
              }
              tr:nth-child(even) td {
                background-color: #f8fafc;
              }
              tr:hover td {
                background-color: #e0f2fe;
              }
              
              /* الملخص */
              .summary {
                background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                padding: 20px;
                border-radius: 12px;
                margin-top: 25px;
                border-left: 6px solid #10b981;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              }
              .summary h3 {
                margin-top: 0;
                color: #1e293b;
                font-size: 18px;
                margin-bottom: 15px;
                text-align: center;
              }
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-top: 15px;
              }
              .summary-item {
                background: white;
                padding: 12px;
                border-radius: 8px;
                text-align: center;
                border: 1px solid #e2e8f0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
              }
              .summary-value {
                display: block;
                font-size: 20px;
                font-weight: bold;
                color: #1e293b;
              }
              .summary-label {
                display: block;
                font-size: 12px;
                color: #64748b;
                margin-top: 5px;
              }
              
              /* الذيل */
              .footer {
                background: linear-gradient(135deg, #64748b 0%, #475569 100%);
                color: white;
                text-align: center;
                padding: 20px;
                border-radius: 10px;
                margin-top: 30px;
                font-size: 12px;
              }
              .footer-info {
                margin: 5px 0;
              }
            </style>
          </head>
          <body>
            <!-- رأس الشركة -->
            <div class="company-header">
              <div class="company-name">شركة الفتيني للمقاولات والاستشارات الهندسية</div>
              <div class="company-subtitle">Al-Fathi Construction & Engineering Consultancy Company</div>
            </div>
            
            <!-- عنوان التقرير -->
            <div class="report-header">
              <div class="report-title">كشف المعدات التفصيلي</div>
            </div>
            
            <!-- معلومات التقرير -->
            <div class="report-info">
              <div class="info-item">
                <span class="info-label">المشروع</span>
                <span class="info-value">${pdfProjectName}</span>
              </div>
              <div class="info-item">
                <span class="info-label">تاريخ التقرير</span>
                <span class="info-value">${formatDate(new Date().toISOString().split('T')[0])}</span>
              </div>
              <div class="info-item">
                <span class="info-label">إجمالي المعدات</span>
                <span class="info-value">${filteredEquipment.length}</span>
              </div>
              <div class="info-item">
                <span class="info-label">المعدات النشطة</span>
                <span class="info-value">${filteredEquipment.filter((e: Equipment) => e.status === 'active').length}</span>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>اسم المعدة</th>
                  <th>الفئة</th>
                  <th>الحالة</th>
                  <th>الموقع</th>
                  <th>سعر الشراء</th>
                  <th>تاريخ الشراء</th>
                </tr>
              </thead>
              <tbody>
                ${filteredEquipment.map((item: Equipment) => {
                  const itemProjectName = item.currentProjectId 
                    ? (Array.isArray(projects) ? projects.find((p: any) => p.id === item.currentProjectId)?.name : undefined) || 'مشروع غير معروف'
                    : 'المستودع';
                  
                  return `
                    <tr>
                      <td>${item.code}</td>
                      <td>${item.name}</td>
                      <td>${item.type === 'construction' ? 'إنشائية' : 
                           item.type === 'transport' ? 'نقل' : 
                           item.type === 'tool' ? 'أداة' : item.type}</td>
                      <td>${getStatusText(item.status)}</td>
                      <td>${itemProjectName}</td>
                      <td>${item.purchasePrice ? formatCurrency(Number(item.purchasePrice)) : 'غير محدد'}</td>
                      <td>${item.purchaseDate ? formatDate(item.purchaseDate) : 'غير محدد'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            
            <!-- الملخص الاحترافي -->
            <div class="summary">
              <h3>ملخص المعدات</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-value">${filteredEquipment.length}</span>
                  <span class="summary-label">إجمالي المعدات</span>
                </div>
                <div class="summary-item">
                  <span class="summary-value">${filteredEquipment.filter((e: Equipment) => e.status === 'active').length}</span>
                  <span class="summary-label">المعدات النشطة</span>
                </div>
                <div class="summary-item">
                  <span class="summary-value">${filteredEquipment.filter((e: Equipment) => e.status === 'maintenance').length}</span>
                  <span class="summary-label">في الصيانة</span>
                </div>
                <div class="summary-item">
                  <span class="summary-value">${filteredEquipment.filter((e: Equipment) => e.status === 'out_of_service').length}</span>
                  <span class="summary-label">خارج الخدمة</span>
                </div>
              </div>
            </div>
            
            <!-- ذيل احترافي -->
            <div class="footer">
              <div class="footer-info">تم إنشاء هذا التقرير بواسطة نظام إدارة المشاريع الإنشائية</div>
              <div class="footer-info">شركة الفتيني للمقاولات والاستشارات الهندسية</div>
              <div class="footer-info">تاريخ الطباعة: ${formatDate(new Date().toISOString().split('T')[0])} - ${new Date().toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
              })}</div>
            </div>
          </body>
        </html>
      `;

      // Create a more reliable print approach
      try {
        // Create blob and object URL for better handling
        const blob = new Blob([printContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const printWindow = window.open(url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (printWindow) {
          // Wait for content to fully load before triggering print
          setTimeout(() => {
            try {
              printWindow.print();
              
              // Clean up the URL after printing
              setTimeout(() => {
                URL.revokeObjectURL(url);
                printWindow.close();
              }, 2000);
              
            } catch (printError) {
              console.warn('خطأ في الطباعة المباشرة، جاري فتح النافذة للمعاينة:', printError);
              // إذا فشلت الطباعة المباشرة، اتركها مفتوحة للمستخدم
              toast({
                title: "تم فتح المعاينة",
                description: "استخدم Ctrl+P أو ⌘+P للطباعة، أو اختر 'طباعة' من القائمة",
                duration: 5000
              });
            }
          }, 1500);
          
          toast({
            title: "جاري إعداد الطباعة",
            description: "انتظر قليلاً ليتم تحميل المحتوى وفتح نافذة الطباعة"
          });
          
        } else {
          // Fallback: Create downloadable HTML file
          const link = document.createElement('a');
          link.href = url;
          link.download = `كشف_المعدات_${pdfProjectName}_${new Date().toISOString().split('T')[0]}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          toast({
            title: "تم تنزيل الملف",
            description: "افتح الملف الذي تم تنزيله واطبعه باستخدام متصفحك"
          });
        }
        
      } catch (windowError) {
        console.error('خطأ في فتح نافذة الطباعة:', windowError);
        
        // Alternative approach: Use data URL
        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(printContent);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `كشف_المعدات_${pdfProjectName}_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "تم إنشاء ملف HTML",
          description: "افتح الملف المحفوظ واطبعه أو احفظه كـ PDF"
        });
      }
      
    } catch (error) {
      console.error('خطأ في تصدير PDF:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير كشف المعدات",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">جاري تحميل المعدات...</p>
          </div>
        </div>
      </div>
    );
  }

  // إضافة تصحيح لمراقبة البيانات
  console.log('🔧 بيانات المعدات في Frontend:', { equipment, count: equipment?.length, isLoading });

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">


      {/* Search and Filters - مكون موحد */}
      <UnifiedSearchFilter
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="البحث بالاسم أو الكود..."
        filters={equipmentFilterConfigs}
        filterValues={{ status: statusFilter, type: typeFilter, project: projectFilter }}
        onFilterChange={(key, value) => {
          if (key === 'status') setStatusFilter(value);
          if (key === 'type') setTypeFilter(value);
          if (key === 'project') setProjectFilter(value);
        }}
        onReset={() => {
          setSearchTerm('');
          setStatusFilter('all');
          setTypeFilter('all');
          setProjectFilter('all');
        }}
        className="mb-4"
      />

      {/* Statistics */}
      <StatsGrid className="mb-6">
        <StatsCard
          title="إجمالي المعدات"
          value={equipment.length}
          icon={Wrench}
          className="border-r-4 border-r-blue-500"
          data-testid="stats-total-equipment"
        />
        <StatsCard
          title="نشطة"
          value={Array.isArray(equipment) ? equipment.filter((e: Equipment) => e.status === 'active').length : 0}
          icon={Activity}
          className="border-r-4 border-r-green-500 bg-gradient-to-r from-green-50 to-white dark:from-green-950 dark:to-gray-900"
          data-testid="stats-active-equipment"
        />
        <StatsCard
          title="في الصيانة"
          value={Array.isArray(equipment) ? equipment.filter((e: Equipment) => e.status === 'maintenance').length : 0}
          icon={Settings}
          className="border-r-4 border-r-yellow-500 bg-gradient-to-r from-yellow-50 to-white dark:from-yellow-950 dark:to-gray-900"
          data-testid="stats-maintenance-equipment"
        />
        <StatsCard
          title="خارج الخدمة"
          value={Array.isArray(equipment) ? equipment.filter((e: Equipment) => e.status === 'out_of_service').length : 0}
          icon={Truck}
          className="border-r-4 border-r-red-500 bg-gradient-to-r from-red-50 to-white dark:from-red-950 dark:to-gray-900"
          data-testid="stats-out-of-service-equipment"
        />
      </StatsGrid>

      {/* Equipment Reports Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              كشوفات المعدات
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReportsSection(!showReportsSection)}
              className="flex items-center gap-2"
              data-testid="button-toggle-reports"
            >
              {showReportsSection ? 'إخفاء' : 'عرض'} الكشوفات
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        {showReportsSection && (
          <CardContent className="space-y-1">
            {/* Report Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">فلترة حسب المشروع</label>
                <Select value={reportProjectFilter} onValueChange={setReportProjectFilter}>
                  <SelectTrigger data-testid="select-report-project-filter" className="h-9 text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="h-3 w-3 text-gray-500 shrink-0" />
                      <SelectValue placeholder="اختر المشروع" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المشاريع</SelectItem>
                    <SelectItem value="warehouse">المستودع</SelectItem>
                    {Array.isArray(projects) ? projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    )) : null}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">فلترة حسب الحالة</label>
                <Select value={reportStatusFilter} onValueChange={setReportStatusFilter}>
                  <SelectTrigger data-testid="select-report-status-filter" className="h-9 text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <Activity className="h-3 w-3 text-gray-500 shrink-0" />
                      <SelectValue placeholder="اختر الحالة" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="maintenance">صيانة</SelectItem>
                    <SelectItem value="out_of_service">خارج الخدمة</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">فلترة حسب الفئة</label>
                <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
                  <SelectTrigger data-testid="select-report-type-filter" className="h-9 text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <Wrench className="h-3 w-3 text-gray-500 shrink-0" />
                      <SelectValue placeholder="اختر الفئة" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    <SelectItem value="أدوات كهربائية">أدوات كهربائية</SelectItem>
                    <SelectItem value="أدوات يدوية">أدوات يدوية</SelectItem>
                    <SelectItem value="أدوات قياس">أدوات قياس</SelectItem>
                    <SelectItem value="معدات لحام">معدات لحام</SelectItem>
                    <SelectItem value="معدات حفر">معدات حفر</SelectItem>
                    <SelectItem value="معدات قطع">معدات قطع</SelectItem>
                    <SelectItem value="أدوات ربط">أدوات ربط</SelectItem>
                    <SelectItem value="مواد كهربائية">مواد كهربائية</SelectItem>
                    <SelectItem value="معدات أمان">معدات أمان</SelectItem>
                    <SelectItem value="أدوات نقل">أدوات نقل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Report Preview */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">معاينة الكشف</h4>
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  {getFilteredEquipmentForReport().length} معدة
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {getFilteredEquipmentForReport().length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">إجمالي المعدات</div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {getFilteredEquipmentForReport().filter((e: Equipment) => e.status === 'active').length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">نشطة</div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {getFilteredEquipmentForReport().filter((e: Equipment) => e.status === 'maintenance').length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">صيانة</div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {getFilteredEquipmentForReport().filter((e: Equipment) => e.status === 'out_of_service').length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">خارج الخدمة</div>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={exportEquipmentToExcel}
                  disabled={isExporting || getFilteredEquipmentForReport().length === 0}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  data-testid="button-export-excel"
                >
                  {isExporting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  تصدير Excel
                </Button>

                <Button
                  onClick={exportEquipmentToPDF}
                  disabled={isExporting || getFilteredEquipmentForReport().length === 0}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                  data-testid="button-export-pdf"
                >
                  {isExporting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  تصدير PDF
                </Button>

                <Button
                  onClick={() => {
                    const filteredEquipment = getFilteredEquipmentForReport();
                    if (filteredEquipment.length === 0) {
                      toast({
                        title: "لا توجد معدات للطباعة",
                        description: "يرجى التأكد من الفلاتر المحددة",
                        variant: "destructive"
                      });
                      return;
                    }
                    exportEquipmentToPDF();
                  }}
                  variant="outline"
                  disabled={isExporting}
                  className="flex items-center gap-2"
                  data-testid="button-print-report"
                >
                  <Printer className="h-4 w-4" />
                  طباعة
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Equipment List - Restaurant Style */}
      <div className="space-y-1">
        {equipment.length === 0 ? (
          <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="text-gray-400">
              <Wrench className="h-16 w-16 mx-auto opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              لا توجد معدات
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              لم يتم العثور على أي معدات تطابق الفلاتر المحددة
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6">
              <Plus className="h-4 w-4 mr-2" />
              إضافة معدة جديدة
            </Button>
          </Card>
        ) : (
          Array.isArray(equipment) ? equipment.map((item: Equipment) => (
            <Card 
              key={item.id}
              className="bg-white dark:bg-gray-800 hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
              onClick={() => handleEquipmentClick(item)}
              data-testid={`card-equipment-${item.id}`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Equipment Image */}
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                      {item.imageUrl && item.imageUrl.trim() !== '' ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onLoad={() => console.log('تم تحميل صورة المعدة بنجاح:', item.name)}
                          onError={(e) => {
                            console.error('فشل في تحميل صورة المعدة:', item.imageUrl);
                            const target = e.target as HTMLImageElement;
                            const parent = target.parentElement!;
                            parent.innerHTML = `<div class="${getTypeBackgroundColor(item.type).replace('bg-gradient-to-br', 'bg-gradient-to-br')} w-full h-full flex items-center justify-center text-white"><span class="text-xl">${getTypeIcon(item.type)}</span></div>`;
                          }}
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-white ${getTypeBackgroundColor(item.type)}`}>
                          {getTypeIcon(item.type)}
                        </div>
                      )}
                    </div>

                    {/* Equipment Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100" data-testid={`text-equipment-name-${item.id}`}>
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getStatusColor(item.status)}`} data-testid={`badge-status-${item.id}`}>
                          {getStatusText(item.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.code}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate" data-testid={`text-location-${item.id}`}>
                          {item.currentProjectId 
                            ? (Array.isArray(projects) ? projects.find((p: any) => p.id === item.currentProjectId)?.name : undefined) || 'مشروع غير معروف'
                            : 'المستودع'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price and Actions */}
                  <div className="flex flex-col items-end gap-2">
                    {item.purchasePrice && (
                      <div className="text-left">
                        <div className="text-sm text-gray-500 dark:text-gray-400">السعر</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(Number(item.purchasePrice))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTransferClick(item, e);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-full px-4 py-2 text-sm font-medium"
                        data-testid={`button-transfer-${item.id}`}
                      >
                        نقل المعدة
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )) : null
        )}
      </div>


      {/* Dialogs */}
      <AddEquipmentDialog 
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projects={projects}
      />

      <AddEquipmentDialog 
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        projects={projects}
        equipment={selectedEquipment}
      />

      <TransferEquipmentDialog
        equipment={selectedEquipment}
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        projects={projects}
      />

      <EquipmentMovementHistoryDialog
        equipment={selectedEquipment}
        open={showMovementHistoryDialog}
        onOpenChange={setShowMovementHistoryDialog}
        projects={projects}
      />

      {/* Equipment Detail Modal - Restaurant Style */}
      <Dialog open={showEquipmentModal} onOpenChange={setShowEquipmentModal}>
        <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
          {selectedEquipment && (
            <div className="relative">
              {/* Close Button */}
              <button
                onClick={() => setShowEquipmentModal(false)}
                className="absolute top-4 right-4 z-10 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Equipment Image */}
              <div className="relative h-64 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {selectedEquipment.imageUrl && selectedEquipment.imageUrl.trim() !== '' ? (
                  <img 
                    src={selectedEquipment.imageUrl}
                    alt={selectedEquipment.name}
                    className="w-full h-full object-cover"
                    onLoad={() => console.log('تم تحميل صورة المعدة في النافذة بنجاح:', selectedEquipment.name)}
                    onError={(e) => {
                      console.error('فشل في تحميل صورة المعدة في النافذة:', selectedEquipment.imageUrl);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement!;
                      parent.innerHTML = `<div class="${getTypeBackgroundColor(selectedEquipment.type).replace('bg-gradient-to-br', 'bg-gradient-to-br')} w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl"><span>${getTypeIcon(selectedEquipment.type)}</span></div>`;
                    }}
                  />
                ) : (
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl ${getTypeBackgroundColor(selectedEquipment.type)}`}>
                    {getTypeIcon(selectedEquipment.type)}
                  </div>
                )}
              </div>

              {/* Equipment Details */}
              <div className="p-6 space-y-1">
                {/* Name and Status */}
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedEquipment.name}
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <Badge className={`text-xs ${getStatusColor(selectedEquipment.status)}`}>
                      {getStatusText(selectedEquipment.status)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {selectedEquipment.code}
                    </Badge>
                  </div>
                </div>

                {/* Price Display */}
                {selectedEquipment.purchasePrice && (
                  <div className="text-center bg-orange-100 dark:bg-orange-900/20 rounded-lg p-3">
                    <div className="text-sm text-orange-600 dark:text-orange-400">السعر</div>
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {formatCurrency(Number(selectedEquipment.purchasePrice))}
                    </div>
                  </div>
                )}

                {/* Location Info */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">الموقع الحالي</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedEquipment.currentProjectId 
                          ? projects.find((p: any) => p.id === selectedEquipment.currentProjectId)?.name || 'مشروع غير معروف'
                          : 'المستودع'
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedEquipment.description && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">الوصف</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedEquipment.description}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    onClick={() => {
                      setShowEquipmentModal(false);
                      handleEditClick(selectedEquipment);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full py-3 font-medium text-sm"
                  >
                    تعديل
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEquipmentModal(false);
                      handleMovementHistoryClick(selectedEquipment);
                    }}
                    className="bg-purple-500 hover:bg-purple-600 text-white rounded-full py-3 font-medium text-sm flex items-center gap-1 justify-center"
                  >
                    <History className="w-4 h-4" />
                    السجل
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEquipmentModal(false);
                      handleDeleteClick(selectedEquipment);
                    }}
                    disabled={deleteMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-full py-3 font-medium text-sm"
                  >
                    {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEquipmentModal(false);
                      handleTransferClick(selectedEquipment);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full py-3 font-medium text-sm"
                  >
                    نقل
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة عرض الصورة بالحجم الكامل */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
              data-testid="button-close-image"
            >
              <X size={24} />
            </button>
            <img 
              src={enlargedImage} 
              alt="صورة المعدة بالحجم الكامل"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}