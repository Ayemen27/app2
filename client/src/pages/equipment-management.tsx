import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Wrench, Truck, PenTool, Settings, Eye, MapPin, Calendar, DollarSign, Activity, Edit, Trash2, X, FileSpreadsheet, FileText, Printer, BarChart3, History, CheckCircle2, Download, Package } from "lucide-react";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { AddEquipmentDialog } from "@/components/equipment/add-equipment-dialog";
import { TransferEquipmentDialog } from "@/components/equipment/transfer-equipment-dialog";
import { EquipmentMovementHistoryDialog } from "@/components/equipment/equipment-movement-history-dialog";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { EXCEL_STYLES, COMPANY_INFO, addReportHeader } from "@/components/excel-export-utils";
import { downloadExcelFile } from "@/utils/webview-download";
import { QUERY_KEYS } from "@/constants/queryKeys";

interface Equipment {
  id: string;
  name: string;
  code: string;
  sku: string;
  type: string;
  unit: string;
  quantity: number;
  status: string;
  condition: string;
  currentProjectId: string | null;
  projectId: string | null;
  purchasePrice: string | number | null;
  purchaseDate: string | null;
  description?: string;
  imageUrl?: string | null;
}

export function EquipmentManagement() {
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "all",
    type: "all",
    project: "all",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showMovementHistoryDialog, setShowMovementHistoryDialog] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  
  const [isExporting, setIsExporting] = useState(false);

  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const { toast } = useToast();

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({ status: "all", type: "all", project: "all" });
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر",
    });
  }, [toast]);

  useEffect(() => {
    const handleAddEquipment = () => setShowAddDialog(true);
    setFloatingAction(handleAddEquipment, "إضافة معدة جديدة");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  const { data: equipment = [], isLoading, refetch: refetchEquipment } = useQuery({
    queryKey: QUERY_KEYS.equipmentFiltered(searchValue, filterValues.status, filterValues.type, filterValues.project),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchValue) params.append('searchTerm', searchValue);
      if (filterValues.status !== 'all') params.append('status', filterValues.status);
      if (filterValues.type !== 'all') params.append('type', filterValues.type);
      if (filterValues.project !== 'all' && filterValues.project !== 'warehouse') {
        params.append('projectId', filterValues.project);
      } else if (filterValues.project === 'warehouse') {
        params.append('projectId', '');
      }
      
      try {
        const result = await apiRequest(`/api/equipment?${params}`);
        return result.data || result || [];
      } catch (error) {
        throw new Error('فشل في جلب المعدات');
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 0,
    enabled: true
  });

  const { data: projects = [] } = useQuery({
    queryKey: QUERY_KEYS.projects,
    queryFn: async () => {
      const response = await apiRequest('/api/projects', 'GET');
      return response;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 1000,
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchEquipment();
      toast({
        title: "تم التحديث",
        description: "تم تحديث البيانات بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث البيانات",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchEquipment, toast]);

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

  const stats = useMemo(() => ({
    total: Array.isArray(equipment) ? equipment.length : 0,
    totalUnits: Array.isArray(equipment) ? equipment.reduce((sum: number, e: Equipment) => sum + (e.quantity || 1), 0) : 0,
    active: Array.isArray(equipment) ? equipment.filter((e: Equipment) => e.status === 'active' || e.status === 'available').length : 0,
    assigned: Array.isArray(equipment) ? equipment.filter((e: Equipment) => e.status === 'assigned').length : 0,
    maintenance: Array.isArray(equipment) ? equipment.filter((e: Equipment) => e.status === 'maintenance').length : 0,
    outOfService: Array.isArray(equipment) ? equipment.filter((e: Equipment) => e.status === 'out_of_service' || e.status === 'lost').length : 0,
    inWarehouse: Array.isArray(equipment) ? equipment.filter((e: Equipment) => !(e.currentProjectId || e.projectId)).length : 0,
  }), [equipment]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 4,
      gap: 'sm',
      items: [
        {
          key: 'total',
          label: 'إجمالي المعدات',
          value: stats.total,
          icon: Wrench,
          color: 'blue',
        },
        {
          key: 'totalUnits',
          label: 'إجمالي الوحدات',
          value: stats.totalUnits,
          icon: Package,
          color: 'indigo',
        },
        {
          key: 'active',
          label: 'متاحة',
          value: stats.active,
          icon: CheckCircle2,
          color: 'green',
        },
        {
          key: 'assigned',
          label: 'مخصصة',
          value: stats.assigned,
          icon: MapPin,
          color: 'purple',
        },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'maintenance',
          label: 'في الصيانة',
          value: stats.maintenance,
          icon: Settings,
          color: 'orange',
        },
        {
          key: 'outOfService',
          label: 'خارج الخدمة',
          value: stats.outOfService,
          icon: Truck,
          color: 'red',
        },
        {
          key: 'inWarehouse',
          label: 'في المستودع',
          value: stats.inWarehouse,
          icon: BarChart3,
          color: 'gray',
        },
      ]
    }
  ], [stats]);

  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: 'الحالة',
      type: 'select',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع الحالات' },
        { value: 'active', label: 'نشط' },
        { value: 'available', label: 'متاحة' },
        { value: 'assigned', label: 'مخصصة' },
        { value: 'maintenance', label: 'صيانة' },
        { value: 'out_of_service', label: 'خارج الخدمة' },
        { value: 'inactive', label: 'غير نشط' },
      ],
    },
    {
      key: 'type',
      label: 'الفئة',
      type: 'select',
      defaultValue: 'all',
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
    },
    {
      key: 'project',
      label: 'المشروع',
      type: 'select',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع المواقع' },
        { value: 'warehouse', label: 'المستودع' },
        ...(Array.isArray(projects) ? projects.map((project: any) => ({
          value: project.id,
          label: project.name,
        })) : []),
      ],
    },
  ], [projects]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'available': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'assigned': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'maintenance': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'out_of_service': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'lost': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'inactive': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[status] || colors.active;
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      'active': 'نشط',
      'available': 'متاحة',
      'assigned': 'مخصصة',
      'maintenance': 'صيانة',
      'out_of_service': 'خارج الخدمة',
      'lost': 'مفقودة',
      'inactive': 'غير نشط'
    };
    return texts[status] || status;
  };

  const getStatusBadgeVariant = (status: string): "success" | "warning" | "destructive" | "secondary" => {
    const variants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
      'active': 'success',
      'available': 'success',
      'assigned': 'secondary',
      'maintenance': 'warning',
      'out_of_service': 'destructive',
      'lost': 'destructive',
      'inactive': 'secondary'
    };
    return variants[status] || 'secondary';
  };

  const getHeaderColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': '#22c55e',
      'maintenance': '#eab308',
      'out_of_service': '#ef4444',
      'inactive': '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

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

  const handleDeleteClick = (item: Equipment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm(`هل أنت متأكد من حذف المعدة "${item.name}" نهائياً؟\n\nلا يمكن التراجع عن هذا الإجراء.`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const getFilteredEquipmentForReport = () => {
    if (!Array.isArray(equipment)) return [];
    return equipment;
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
      
      workbook.creator = COMPANY_INFO.name;
      workbook.lastModifiedBy = 'نظام إدارة المعدات';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      const worksheet = workbook.addWorksheet('كشف المعدات');
      worksheet.views = [{ rightToLeft: true }];
      
      const reportProjectName = filterValues.project === "all" ? "جميع المشاريع" : 
                                filterValues.project === "warehouse" ? "المستودع" :
                                (Array.isArray(projects) ? projects.find((p: any) => p.id === filterValues.project)?.name : undefined) || "مشروع محدد";
      
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
      
      const headers = ['الكود', 'اسم المعدة', 'العدد', 'الوحدة', 'الفئة', 'الحالة', 'الموقع', 'سعر الشراء', 'تاريخ الشراء', 'الوصف'];
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
      
      worksheet.getColumn(1).width = 15;
      worksheet.getColumn(2).width = 25;
      worksheet.getColumn(3).width = 10;
      worksheet.getColumn(4).width = 12;
      worksheet.getColumn(5).width = 15;
      worksheet.getColumn(6).width = 15;
      worksheet.getColumn(7).width = 25;
      worksheet.getColumn(8).width = 18;
      worksheet.getColumn(9).width = 15;
      worksheet.getColumn(10).width = 30;
      
      currentRow++;

      filteredEquipment.forEach((item: Equipment, index: number) => {
        const eqProjectId = item.currentProjectId || item.projectId;
        const projectName = eqProjectId 
          ? (Array.isArray(projects) ? projects.find((p: any) => p.id === eqProjectId)?.name : undefined) || 'مشروع غير معروف'
          : 'المستودع';
        
        const row = worksheet.addRow([
          item.code,
          item.name,
          item.quantity || 1,
          item.unit || 'قطعة',
          item.type || 'غير محدد',
          getStatusText(item.status),
          projectName,
          item.purchasePrice ? formatCurrency(Number(item.purchasePrice)) : 'غير محدد',
          item.purchaseDate ? formatDate(item.purchaseDate) : 'غير محدد',
          item.description || 'غير محدد'
        ]);
        
        row.eachCell((cell, colNumber) => {
          cell.font = EXCEL_STYLES.fonts.data;
          cell.border = {
            top: EXCEL_STYLES.borders.thin,
            bottom: EXCEL_STYLES.borders.thin,
            left: EXCEL_STYLES.borders.thin,
            right: EXCEL_STYLES.borders.thin
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          
          if (colNumber === 6 && item.purchasePrice) {
            cell.numFmt = '#,##0 "ريال"';
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
          
          if (colNumber === 8) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          }
          
          if (index % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          }
        });
        currentRow++;
      });

      const filenameProjectName = filterValues.project === "all" ? "جميع_المشاريع" : 
                                  filterValues.project === "warehouse" ? "المستودع" :
                                  (Array.isArray(projects) ? projects.find((p: any) => p.id === filterValues.project)?.name : undefined)?.replace(/\s/g, '_') || "مشروع_محدد";
      
      const filename = `كشف_المعدات_${filenameProjectName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      const buffer = await workbook.xlsx.writeBuffer();
      const downloadResult = await downloadExcelFile(buffer as ArrayBuffer, filename);
      
      if (downloadResult) {
        toast({
          title: "تم تصدير كشف المعدات بنجاح",
          description: `تم حفظ الملف: ${filename}`
        });
      } else {
        toast({
          title: "تعذر التنزيل",
          description: "تم تجهيز الملف لكن فشل التنزيل. حاول مرة أخرى.",
          variant: "destructive"
        });
      }
      
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

  const buildEquipmentReportHTML = (filteredEquipment: Equipment[], projectLabel: string) => {
    const reportDate = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    const totalValue = filteredEquipment.reduce((sum, e) => sum + (Number(e.purchasePrice) || 0), 0);
    const totalUnits = filteredEquipment.reduce((sum, e) => sum + (e.quantity || 1), 0);
    const activeCount = filteredEquipment.filter(e => e.status === 'active' || e.status === 'available').length;
    const assignedCount = filteredEquipment.filter(e => e.status === 'assigned').length;
    const maintenanceCount = filteredEquipment.filter(e => e.status === 'maintenance').length;

    const rows = filteredEquipment.map((item: Equipment, idx: number) => {
      const itemProjId = item.currentProjectId || item.projectId;
      const itemProjectName = itemProjId
        ? (Array.isArray(projects) ? projects.find((p: any) => p.id === itemProjId)?.name : undefined) || '\u0645\u0634\u0631\u0648\u0639 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641'
        : '\u0627\u0644\u0645\u0633\u062a\u0648\u062f\u0639';
      const bg = idx % 2 === 0 ? '' : 'background:#f1f5f9;';
      const statusColor = (item.status === 'active' || item.status === 'available') ? '#16a34a' :
                           item.status === 'assigned' ? '#7c3aed' :
                           item.status === 'maintenance' ? '#ea580c' : '#dc2626';
      return `<tr style="${bg}">
        <td style="padding:10px 8px;text-align:center;border:1px solid #cbd5e1;font-size:12px;font-weight:600;color:#1e40af;">${item.code || '-'}</td>
        <td style="padding:10px 8px;text-align:right;border:1px solid #cbd5e1;font-size:12px;font-weight:500;">${item.name}</td>
        <td style="padding:10px 8px;text-align:center;border:1px solid #cbd5e1;font-size:12px;">${item.quantity || 1}</td>
        <td style="padding:10px 8px;text-align:center;border:1px solid #cbd5e1;font-size:12px;">${item.unit || '\u0642\u0637\u0639\u0629'}</td>
        <td style="padding:10px 8px;text-align:center;border:1px solid #cbd5e1;font-size:12px;">${item.type || '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f'}</td>
        <td style="padding:10px 8px;text-align:center;border:1px solid #cbd5e1;font-size:12px;"><span style="background:${statusColor}15;color:${statusColor};padding:3px 10px;border-radius:12px;font-weight:600;font-size:11px;">${getStatusText(item.status)}</span></td>
        <td style="padding:10px 8px;text-align:center;border:1px solid #cbd5e1;font-size:12px;">${itemProjectName}</td>
        <td style="padding:10px 8px;text-align:left;border:1px solid #cbd5e1;font-size:12px;font-weight:500;">${item.purchasePrice ? formatCurrency(Number(item.purchasePrice)) : '-'}</td>
        <td style="padding:10px 8px;text-align:center;border:1px solid #cbd5e1;font-size:11px;">${item.purchaseDate ? formatDate(item.purchaseDate) : '-'}</td>
      </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>\u0643\u0634\u0641 \u0627\u0644\u0645\u0639\u062f\u0627\u062a - ${projectLabel}</title>
  <style>
    @page { margin: 1.5cm 1cm; size: A4 landscape; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; background: #fff; color: #1e293b; padding: 0; }
    .page-wrap { max-width: 1100px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #fff; padding: 24px 30px; border-radius: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .header-right h1 { font-size: 20px; margin-bottom: 4px; }
    .header-right p { font-size: 12px; opacity: 0.85; }
    .header-left { text-align: left; font-size: 12px; opacity: 0.9; line-height: 1.8; }
    .stats-bar { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
    .stat-box { flex: 1; min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; text-align: center; }
    .stat-box .val { font-size: 22px; font-weight: 700; color: #1e40af; }
    .stat-box .lbl { font-size: 11px; color: #64748b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead th { background: #1e3a5f; color: #fff; padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 700; border: 1px solid #1e3a5f; }
    .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="page-wrap">
    <div class="header">
      <div class="header-right">
        <h1>\u0627\u0644\u0641\u062a\u064a\u0646\u064a \u0644\u0644\u0645\u0642\u0627\u0648\u0644\u0627\u062a \u0627\u0644\u0639\u0627\u0645\u0629 \u0648\u0627\u0644\u0627\u0633\u062a\u0634\u0627\u0631\u0627\u062a \u0627\u0644\u0647\u0646\u062f\u0633\u064a\u0629</h1>
        <p>\u0643\u0634\u0641 \u0627\u0644\u0645\u0639\u062f\u0627\u062a \u0627\u0644\u062a\u0641\u0635\u064a\u0644\u064a - ${projectLabel}</p>
      </div>
      <div class="header-left">
        <div>\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0635\u062f\u0627\u0631: ${reportDate}</div>
        <div>\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0639\u062f\u0627\u062a: ${filteredEquipment.length} | \u0627\u0644\u0648\u062d\u062f\u0627\u062a: ${totalUnits}</div>
      </div>
    </div>
    <div class="stats-bar">
      <div class="stat-box"><div class="val">${filteredEquipment.length}</div><div class="lbl">\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0639\u062f\u0627\u062a</div></div>
      <div class="stat-box"><div class="val" style="color:#16a34a;">${activeCount}</div><div class="lbl">\u0645\u062a\u0627\u062d\u0629</div></div>
      <div class="stat-box"><div class="val" style="color:#7c3aed;">${assignedCount}</div><div class="lbl">\u0645\u062e\u0635\u0635\u0629</div></div>
      <div class="stat-box"><div class="val" style="color:#ea580c;">${maintenanceCount}</div><div class="lbl">\u0641\u064a \u0627\u0644\u0635\u064a\u0627\u0646\u0629</div></div>
      <div class="stat-box"><div class="val" style="color:#1e40af;">${totalValue > 0 ? formatCurrency(totalValue) : '-'}</div><div class="lbl">\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0642\u064a\u0645\u0629</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:80px;">\u0627\u0644\u0643\u0648\u062f</th>
          <th>\u0627\u0633\u0645 \u0627\u0644\u0645\u0639\u062f\u0629</th>
          <th style="width:55px;">\u0627\u0644\u0639\u062f\u062f</th>
          <th style="width:65px;">\u0627\u0644\u0648\u062d\u062f\u0629</th>
          <th style="width:100px;">\u0627\u0644\u0641\u0626\u0629</th>
          <th style="width:85px;">\u0627\u0644\u062d\u0627\u0644\u0629</th>
          <th style="width:120px;">\u0627\u0644\u0645\u0648\u0642\u0639</th>
          <th style="width:100px;">\u0633\u0639\u0631 \u0627\u0644\u0634\u0631\u0627\u0621</th>
          <th style="width:90px;">\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0634\u0631\u0627\u0621</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">\u062a\u0645 \u0627\u0644\u0625\u0635\u062f\u0627\u0631 \u0628\u0648\u0627\u0633\u0637\u0629 \u0646\u0638\u0627\u0645 AXION - ${reportDate}</div>
  </div>
</body>
</html>`;
  };

  const getProjectLabel = () => {
    if (filterValues.project === "all") return "\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0634\u0627\u0631\u064a\u0639";
    if (filterValues.project === "warehouse") return "\u0627\u0644\u0645\u0633\u062a\u0648\u062f\u0639";
    return (Array.isArray(projects) ? projects.find((p: any) => p.id === filterValues.project)?.name : undefined) || "\u0645\u0634\u0631\u0648\u0639 \u0645\u062d\u062f\u062f";
  };

  const openPrintWindow = (htmlContent: string) => {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      toast({ title: "\u062a\u0639\u0630\u0631 \u0641\u062a\u062d \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629", description: "\u064a\u0631\u062c\u0649 \u0627\u0644\u0633\u0645\u0627\u062d \u0628\u0627\u0644\u0646\u0648\u0627\u0641\u0630 \u0627\u0644\u0645\u0646\u0628\u062b\u0642\u0629 \u0641\u064a \u0627\u0644\u0645\u062a\u0635\u0641\u062d", variant: "destructive" });
      return false;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
    return true;
  };

  const exportEquipmentToPDF = () => {
    const filteredEquipment = getFilteredEquipmentForReport();
    if (filteredEquipment.length === 0) {
      toast({ title: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0639\u062f\u0627\u062a \u0644\u0644\u062a\u0635\u062f\u064a\u0631", description: "\u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u0644\u0641\u0644\u0627\u062a\u0631 \u0627\u0644\u0645\u062d\u062f\u062f\u0629", variant: "destructive" });
      return;
    }
    try {
      setIsExporting(true);
      const htmlContent = buildEquipmentReportHTML(filteredEquipment, getProjectLabel());
      const success = openPrintWindow(htmlContent);
      if (success) {
        toast({ title: "\u062c\u0627\u0647\u0632 \u0644\u0644\u062d\u0641\u0638 \u0643\u0640 PDF", description: "\u0627\u062e\u062a\u0631 '\u062d\u0641\u0638 \u0643\u0640 PDF' \u0645\u0646 \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629" });
      }
    } catch (error) {
      console.error('\u062e\u0637\u0623 \u0641\u064a \u062a\u0635\u062f\u064a\u0631 PDF:', error);
      toast({ title: "\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u0635\u062f\u064a\u0631", description: "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u062a\u0635\u062f\u064a\u0631 \u0643\u0634\u0641 \u0627\u0644\u0645\u0639\u062f\u0627\u062a", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const printEquipmentReport = () => {
    const filteredEquipment = getFilteredEquipmentForReport();
    if (filteredEquipment.length === 0) {
      toast({ title: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0639\u062f\u0627\u062a \u0644\u0644\u0637\u0628\u0627\u0639\u0629", description: "\u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u0644\u0641\u0644\u0627\u062a\u0631 \u0627\u0644\u0645\u062d\u062f\u062f\u0629", variant: "destructive" });
      return;
    }
    try {
      setIsExporting(true);
      const htmlContent = buildEquipmentReportHTML(filteredEquipment, getProjectLabel());
      const success = openPrintWindow(htmlContent);
      if (success) {
        toast({ title: "\u062c\u0627\u0647\u0632 \u0644\u0644\u0637\u0628\u0627\u0639\u0629", description: "\u062a\u0645 \u0641\u062a\u062d \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629" });
      }
    } catch (error) {
      console.error('\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0637\u0628\u0627\u0639\u0629:', error);
      toast({ title: "\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0637\u0628\u0627\u0639\u0629", description: "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0641\u062a\u062d \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629", variant: "destructive" });
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4" dir="rtl">
      <UnifiedFilterDashboard
        statsRows={statsRowsConfig}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="البحث بالاسم أو الكود..."
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={[
          {
            key: 'export-excel',
            icon: FileSpreadsheet,
            label: 'Excel',
            onClick: exportEquipmentToExcel,
            variant: 'outline',
            disabled: equipment.length === 0 || isExporting,
            loading: isExporting,
            tooltip: 'تصدير إلى Excel'
          },
          {
            key: 'export-pdf',
            icon: FileText,
            label: 'PDF',
            onClick: exportEquipmentToPDF,
            variant: 'outline',
            disabled: equipment.length === 0 || isExporting,
            loading: isExporting,
            tooltip: 'تصدير كملف PDF'
          },
          {
            key: 'print',
            icon: Printer,
            label: 'طباعة',
            onClick: printEquipmentReport,
            variant: 'outline',
            disabled: equipment.length === 0 || isExporting,
            tooltip: 'طباعة كشف المعدات'
          }
        ]}
      />

      {equipment.length === 0 ? (
        <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <div className="text-gray-400">
            <Wrench className="h-16 w-16 mx-auto opacity-50" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4">
            لا توجد معدات
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            لم يتم العثور على أي معدات تطابق الفلاتر المحددة
          </p>
          <Button onClick={() => setShowAddDialog(true)} className="bg-blue-500 hover:bg-blue-600 text-white mt-4">
            <Plus className="h-4 w-4 mr-2" />
            إضافة معدة جديدة
          </Button>
        </Card>
      ) : (
        <UnifiedCardGrid columns={3}>
          {Array.isArray(equipment) && equipment.map((item: Equipment) => {
            const eqProjId = item.currentProjectId || item.projectId;
            const projectName = eqProjId 
              ? (Array.isArray(projects) ? projects.find((p: any) => p.id === eqProjId)?.name : undefined) || 'مشروع غير معروف'
              : 'المستودع';
            
            return (
              <UnifiedCard
                key={item.id}
                title={item.name}
                subtitle={item.code}
                titleIcon={Wrench}
                headerColor={getHeaderColor(item.status)}
                onClick={() => handleEquipmentClick(item)}
                badges={[
                  {
                    label: getStatusText(item.status),
                    variant: getStatusBadgeVariant(item.status),
                  },
                  ...(item.type ? [{
                    label: item.type,
                    variant: "secondary" as const,
                  }] : []),
                ]}
                fields={[
                  {
                    label: "العدد",
                    value: `${item.quantity || 1} ${item.unit || 'قطعة'}`,
                    icon: Package,
                    emphasis: (item.quantity || 1) > 1,
                  },
                  {
                    label: "الموقع",
                    value: projectName,
                    icon: MapPin,
                  },
                  {
                    label: "سعر الشراء",
                    value: item.purchasePrice ? formatCurrency(Number(item.purchasePrice)) : "غير محدد",
                    icon: DollarSign,
                    emphasis: !!item.purchasePrice,
                    color: item.purchasePrice ? "success" : "muted",
                  },
                  {
                    label: "تاريخ الشراء",
                    value: item.purchaseDate ? formatDate(item.purchaseDate) : "غير محدد",
                    icon: Calendar,
                  },
                  ...(item.description ? [{
                    label: "الوصف",
                    value: item.description,
                    icon: Wrench,
                  }] : []),
                ]}
                actions={[
                  {
                    icon: Edit,
                    label: "تعديل",
                    onClick: () => handleEditClick(item),
                  },
                  {
                    icon: History,
                    label: "السجل",
                    onClick: () => handleMovementHistoryClick(item),
                  },
                  {
                    icon: Trash2,
                    label: "حذف",
                    variant: "ghost",
                    onClick: () => handleDeleteClick(item),
                  },
                ]}
                footer={
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTransferClick(item, e);
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm"
                    size="sm"
                  >
                    نقل المعدة
                  </Button>
                }
                compact
              />
            );
          })}
        </UnifiedCardGrid>
      )}

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
        equipment={selectedEquipment as any}
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

      <Dialog open={showEquipmentModal} onOpenChange={setShowEquipmentModal}>
        <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
          {selectedEquipment && (
            <div className="relative">
              <button
                onClick={() => setShowEquipmentModal(false)}
                className="absolute top-4 right-4 z-10 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative h-48 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Wrench className="h-16 w-16 text-white opacity-50" />
              </div>

              <div className="p-6 space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedEquipment.name}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge className={`text-xs ${getStatusColor(selectedEquipment.status)}`}>
                      {getStatusText(selectedEquipment.status)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {selectedEquipment.code}
                    </Badge>
                  </div>
                </div>

                {selectedEquipment.purchasePrice && (
                  <div className="text-center bg-orange-100 dark:bg-orange-900/20 rounded-lg p-3">
                    <div className="text-sm text-orange-600 dark:text-orange-400">السعر</div>
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {formatCurrency(Number(selectedEquipment.purchasePrice))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">العدد</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedEquipment.quantity || 1} {selectedEquipment.unit || 'قطعة'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">الموقع الحالي</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {(selectedEquipment.currentProjectId || selectedEquipment.projectId)
                          ? projects.find((p: any) => p.id === (selectedEquipment.currentProjectId || selectedEquipment.projectId))?.name || 'مشروع غير معروف'
                          : 'المستودع'
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-full py-3 font-medium text-sm"
                  >
                    {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEquipmentModal(false);
                      handleTransferClick(selectedEquipment);
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full py-3 font-medium text-sm"
                  >
                    نقل
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>
            <img 
              src={enlargedImage} 
              alt="صورة المعدة بالحجم الكامل"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EquipmentManagement;
