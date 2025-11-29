import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Building2, 
  FileText, 
  Download, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users,
  Package,
  CreditCard,
  AlertCircle,
  Phone,
  MapPin,
  Eye,
  ShoppingCart,
  Receipt,
  Wallet
} from "lucide-react";
import { UnifiedSearchFilter } from "@/components/ui/unified-search-filter";
import { StatsCard, StatsGrid } from "@/components/ui/stats-card";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import type { Supplier, MaterialPurchase, Project } from "@shared/schema";

interface SupplierAccountSummary {
  totalPurchases: number;
  totalPaid: number;
  totalRemaining: number;
  purchaseCount: number;
}

export default function SupplierAccountsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { setFloatingAction } = useFloatingButton();

  // إزالة الزر العائم
  useEffect(() => {
    setFloatingAction(null);
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // جلب قائمة المشاريع
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/projects", "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as Project[];
        }
        return Array.isArray(response) ? response as Project[] : [];
      } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
      }
    },
  });

  // جلب قائمة الموردين
  const { data: suppliers = [], isLoading: isLoadingSuppliers, error: suppliersError } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suppliers", "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as Supplier[];
        }
        return Array.isArray(response) ? response as Supplier[] : [];
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        return [];
      }
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // جلب نطاق التواريخ المتاحة في قاعدة البيانات
  const { data: dateRange } = useQuery<{ minDate: string; maxDate: string }>({
    queryKey: ["/api/material-purchases/date-range"],
    staleTime: 300000, // 5 minutes
  });

  // فلترة الموردين حسب البحث
  const filteredSuppliers = Array.isArray(suppliers) ? suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // جلب بيانات المشتريات للمورد المحدد
  const { data: purchases = [], isLoading: isLoadingPurchases } = useQuery<MaterialPurchase[]>({
    queryKey: ["/api/material-purchases", selectedProjectId, selectedSupplierId, dateFrom, dateTo, paymentTypeFilter],
    queryFn: async () => {
      if (!selectedSupplierId) return [];
      
      const params = new URLSearchParams();
      params.append('supplierId', selectedSupplierId);
      if (selectedProjectId && selectedProjectId !== 'all') params.append('projectId', selectedProjectId);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (paymentTypeFilter && paymentTypeFilter !== 'all') params.append('purchaseType', paymentTypeFilter);
      
      console.log('🔍 طلب مشتريات المورد:', { selectedSupplierId, selectedProjectId, dateFrom, dateTo, paymentTypeFilter });
      
      const response = await fetch(`/api/material-purchases?${params.toString()}`);
      if (!response.ok) {
        console.error('خطأ في جلب المشتريات:', response.status, response.statusText);
        return [];
      }
      const allPurchases = await response.json();
      
      console.log('📊 تم جلب المشتريات:', allPurchases.length);
      
      // إضافة الحقول المفقودة للتوافق مع النوع MaterialPurchase
      return allPurchases.map((purchase: any) => ({
        ...purchase,
        paidAmount: purchase.paidAmount || "0",
        remainingAmount: purchase.remainingAmount || "0"
      }));
    },
    enabled: !!selectedSupplierId,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  });

  // جلب الإحصائيات العامة (بدون فلاتر) للبطاقات العلوية
  const { data: globalStats } = useQuery<{
    totalSuppliers: number;
    totalCashPurchases: string;
    totalCreditPurchases: string;
    totalDebt: string;
    totalPaid: string;
    remainingDebt: string;
    activeSuppliers: number;
  }>({
    queryKey: ["/api/suppliers/statistics"],
    queryFn: async () => {
      const response = await fetch('/api/suppliers/statistics');
      if (!response.ok) {
        console.error('خطأ في جلب الإحصائيات العامة:', response.status, response.statusText);
        return {
          totalSuppliers: 0,
          totalCashPurchases: "0",
          totalCreditPurchases: "0",
          totalDebt: "0",
          totalPaid: "0",
          remainingDebt: "0",
          activeSuppliers: 0
        };
      }
      return await response.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 60000 // 1 minute
  });

  // جلب إحصائيات مفلترة للمورد المحدد
  const { data: supplierStats } = useQuery<{
    totalSuppliers: number;
    totalCashPurchases: string;
    totalCreditPurchases: string;
    totalDebt: string;
    totalPaid: string;
    remainingDebt: string;
    activeSuppliers: number;
  }>({
    queryKey: ["/api/suppliers/statistics", selectedProjectId, selectedSupplierId, dateFrom, dateTo, paymentTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSupplierId) params.append('supplierId', selectedSupplierId);
      if (selectedProjectId && selectedProjectId !== 'all') params.append('projectId', selectedProjectId);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (paymentTypeFilter && paymentTypeFilter !== 'all') params.append('purchaseType', paymentTypeFilter);
      
      console.log('🔄 إرسال طلب إحصائيات مفلترة:', Object.fromEntries(params));
      
      const response = await fetch(`/api/suppliers/statistics?${params.toString()}`);
      if (!response.ok) {
        console.error('خطأ في جلب إحصائيات الموردين المفلترة:', response.status, response.statusText);
        return {
          totalSuppliers: 0,
          totalCashPurchases: "0",
          totalCreditPurchases: "0",
          totalDebt: "0",
          totalPaid: "0",
          remainingDebt: "0",
          activeSuppliers: 0
        };
      }
      return await response.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
    enabled: !!selectedSupplierId // فقط عند تحديد مورد
  });

  // إزالة الطلب للإحصائيات المركبة والاعتماد على الحسابات المحلية

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // حساب الإجماليات للمورد المحدد (للعرض التفصيلي) مع معالجة آمنة
  const totals = Array.isArray(purchases) ? purchases.reduce((acc, purchase) => {
    acc.totalAmount += parseFloat(purchase.totalAmount || "0");
    acc.paidAmount += parseFloat(purchase.paidAmount || "0");
    acc.remainingAmount += parseFloat(purchase.remainingAmount || "0");
    return acc;
  }, { totalAmount: 0, paidAmount: 0, remainingAmount: 0 }) : { totalAmount: 0, paidAmount: 0, remainingAmount: 0 };

  // فصل المشتريات حسب نوع الدفع للمورد المحدد (مع معالجة آمنة ودعم الأحرف العربية)
  const safePurchases = Array.isArray(purchases) ? purchases : [];
  const cashPurchases = safePurchases.filter(p => {
    const cleanType = p.purchaseType?.replace(/['"]/g, '') || '';
    return cleanType === "نقد";
  });
  const creditPurchases = safePurchases.filter(p => {
    const cleanType = p.purchaseType?.replace(/['"]/g, '') || '';
    // البحث عن جميع أشكال "أجل": مع الألف العادية والمد
    return cleanType === "أجل" || cleanType === "آجل" || cleanType.includes("جل");
  });
  
  const cashTotals = {
    totalAmount: Array.isArray(cashPurchases) ? cashPurchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0) : 0,
    count: Array.isArray(cashPurchases) ? cashPurchases.length : 0
  };
  
  const creditTotals = {
    totalAmount: Array.isArray(creditPurchases) ? creditPurchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0) : 0,
    count: Array.isArray(creditPurchases) ? creditPurchases.length : 0
  };

  // استخدام الإحصائيات العامة للبطاقات العلوية والمفلترة للمورد المحدد
  const overallStats = {
    // الإحصائيات العامة من globalStats (بدون فلاتر)
    totalSuppliers: globalStats?.totalSuppliers || suppliers.length,
    totalCashPurchases: globalStats?.totalCashPurchases || "0",
    totalCreditPurchases: globalStats?.totalCreditPurchases || "0",
    totalDebt: globalStats?.totalDebt || "0",
    totalPaid: globalStats?.totalPaid || "0",
    remainingDebt: selectedSupplierId ? (supplierStats?.remainingDebt || "0") : (globalStats?.remainingDebt || "0"),
    activeSuppliers: globalStats?.activeSuppliers || (Array.isArray(suppliers) ? suppliers.filter(s => parseFloat(s.totalDebt) > 0).length : 0),
    totalPurchases: Array.isArray(purchases) ? purchases.length : 0
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString('en-US') + " ريال";
  };

  const getPaymentStatusBadge = (purchaseType: string, remainingAmount: string) => {
    const remaining = parseFloat(remainingAmount || "0");
    if (remaining === 0) {
      return <Badge variant="default" className="bg-green-100 text-green-800 text-xs">مسدد</Badge>;
    }
    if (purchaseType === "نقد") {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">نقد</Badge>;
    }
    return <Badge variant="destructive" className="text-xs">مؤجل</Badge>;
  };

  const exportToExcel = async () => {
    if (!selectedSupplier || purchases.length === 0) return;

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('كشف حساب المورد');

    // إعداد اتجاه النص من اليمين إلى اليسار
    worksheet.views = [{ rightToLeft: true }];

    // إعدادات الطباعة المحسنة للورقة A4
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0, // تلقائي حسب المحتوى
      margins: {
        left: 0.2,    // تقليل الهوامش إلى أقصى حد
        right: 0.2,
        top: 0.3,
        bottom: 0.3,
        header: 0.1,
        footer: 0.1
      },
      horizontalCentered: true,
      verticalCentered: false,
      scale: 80,  // تصغير المقياس أكثر لاستغلال أفضل للمساحة
      blackAndWhite: false,     // طباعة ملونة
      draft: false              // طباعة عالية الجودة
    };

    // تحديد عرض الأعمدة المحسن للطباعة على A4
    worksheet.columns = [
      { width: 3 }, { width: 9 }, { width: 12 }, { width: 16 }, { width: 20 }, { width: 6 }, 
      { width: 9 }, { width: 11 }, { width: 8 }, { width: 9 }, { width: 9 }, { width: 8 }
    ];

    let currentRow = 1;

    // =========================
    // رأس التقرير الاحترافي
    // =========================
    
    // شعار الشركة والعنوان الرئيسي
    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = 'شركة الفتيني للمقاولات والاستشارات الهندسية';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1f4e79' } };
    titleCell.border = {
      top: { style: 'thick', color: { argb: '1f4e79' } },
      bottom: { style: 'thick', color: { argb: '1f4e79' } },
      left: { style: 'thick', color: { argb: '1f4e79' } },
      right: { style: 'thick', color: { argb: '1f4e79' } }
    };
    worksheet.getRow(currentRow).height = 25;
    currentRow++;

    // عنوان فرعي
    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    const subtitleCell = worksheet.getCell(`A${currentRow}`);
    subtitleCell.value = 'كشف حساب المورد - تقرير مفصل';
    subtitleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: '1f4e79' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'f2f2f2' } };
    subtitleCell.border = {
      top: { style: 'thin', color: { argb: 'cccccc' } },
      bottom: { style: 'thin', color: { argb: 'cccccc' } },
      left: { style: 'thick', color: { argb: '1f4e79' } },
      right: { style: 'thick', color: { argb: '1f4e79' } }
    };
    worksheet.getRow(currentRow).height = 16;
    currentRow++;

    currentRow += 1;

    // =========================
    // معلومات المورد
    // =========================
    
    // عنوان قسم معلومات المورد - تصميم احترافي
    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    const supplierHeaderCell = worksheet.getCell(`A${currentRow}`);
    supplierHeaderCell.value = '📋 بيانات المورد';
    supplierHeaderCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    supplierHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    supplierHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2e75b6' } };
    supplierHeaderCell.border = {
      top: { style: 'medium', color: { argb: '2e75b6' } },
      bottom: { style: 'medium', color: { argb: '2e75b6' } },
      left: { style: 'thick', color: { argb: '1f4e79' } },
      right: { style: 'thick', color: { argb: '1f4e79' } }
    };
    worksheet.getRow(currentRow).height = 22;
    currentRow++;

    // بيانات المورد في جدول احترافي مُنسق
    const supplierData = [
      ['اسم المورد', selectedSupplier.name, 'رقم الهاتف', selectedSupplier.phone || 'غير محدد'],
      ['شخص الاتصال', selectedSupplier.contactPerson || 'غير محدد', 'العنوان', selectedSupplier.address || 'غير محدد']
    ];

    supplierData.forEach((dataRow, rowIndex) => {
      const row = worksheet.getRow(currentRow);
      
      // العمود الأول: التسمية
      const labelCell1 = row.getCell(1);
      labelCell1.value = dataRow[0];
      labelCell1.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1f4e79' } };
      labelCell1.alignment = { horizontal: 'center', vertical: 'middle' };
      labelCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'e8f4fd' } };
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      
      // العمود الثاني: القيمة
      const valueCell1 = row.getCell(3);
      valueCell1.value = dataRow[1];
      valueCell1.font = { name: 'Arial', size: 9 };
      valueCell1.alignment = { horizontal: 'center', vertical: 'middle' };
      valueCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ffffff' } };
      worksheet.mergeCells(`C${currentRow}:F${currentRow}`);
      
      // العمود الثالث: التسمية الثانية
      const labelCell2 = row.getCell(7);
      labelCell2.value = dataRow[2];
      labelCell2.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1f4e79' } };
      labelCell2.alignment = { horizontal: 'center', vertical: 'middle' };
      labelCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'e8f4fd' } };
      worksheet.mergeCells(`G${currentRow}:H${currentRow}`);
      
      // العمود الرابع: القيمة الثانية
      const valueCell2 = row.getCell(9);
      valueCell2.value = dataRow[3];
      valueCell2.font = { name: 'Arial', size: 9 };
      valueCell2.alignment = { horizontal: 'center', vertical: 'middle' };
      valueCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ffffff' } };
      worksheet.mergeCells(`I${currentRow}:L${currentRow}`);
      
      // إضافة حدود لجميع الخلايا
      [1, 3, 7, 9].forEach(col => {
        const cell = row.getCell(col);
        cell.border = {
          top: { style: 'thin', color: { argb: 'cccccc' } },
          bottom: { style: 'thin', color: { argb: 'cccccc' } },
          left: { style: 'thin', color: { argb: 'cccccc' } },
          right: { style: 'thin', color: { argb: 'cccccc' } }
        };
      });
      
      worksheet.getRow(currentRow).height = 18;
      currentRow++;
    });

    // فترة التقرير والمشروع
    if (selectedProject || dateFrom || dateTo) {
      currentRow++;
      const reportInfoRow = worksheet.getRow(currentRow);
      let infoText = '';
      if (selectedProject) infoText += `المشروع: ${selectedProject.name}`;
      if (dateFrom || dateTo) {
        if (infoText) infoText += ' | ';
        infoText += `الفترة: من ${dateFrom || 'البداية'} إلى ${dateTo || 'النهاية'}`;
      }
      
      worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
      const infoCell = worksheet.getCell(`A${currentRow}`);
      infoCell.value = infoText;
      infoCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '666666' } };
      infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
      infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'f9f9f9' } };
      currentRow++;
    }

    currentRow += 1;

    // =========================
    // جدول المشتريات
    // =========================

    // رأس الجدول (مع إضافة عمود اسم المشروع)
    const headers = ['#', 'التاريخ', 'رقم الفاتورة', 'اسم المشروع', 'المادة', 'الكمية', 'سعر الوحدة', 'المبلغ الإجمالي', 'نوع الدفع', 'المدفوع', 'المتبقي', 'الحالة'];
    const headerRow = worksheet.getRow(currentRow);
    
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1f4e79' } };
      cell.border = {
        top: { style: 'thin', color: { argb: '1f4e79' } },
        bottom: { style: 'thin', color: { argb: '1f4e79' } },
        left: { style: 'thin', color: { argb: '1f4e79' } },
        right: { style: 'thin', color: { argb: '1f4e79' } }
      };
    });
    headerRow.height = 20;
    currentRow++;

    // بيانات المشتريات
    purchases.forEach((purchase, index) => {
      const row = worksheet.getRow(currentRow);
      
      // العثور على اسم المشروع
      const projectName = projects.find(p => p.id === purchase.projectId)?.name || 'غير محدد';
      
      // العثور على اسم المادة (استخدام اسم المادة إذا كان متوفراً، وإلا اسم المادة المخزن في النظام)
      const materialName = (purchase as any).materialName || (purchase as any).material?.name || purchase.materialId || 'غير محدد';
      
      const rowData = [
        index + 1,
        formatDate(purchase.invoiceDate),
        purchase.invoiceNumber || '-',
        projectName,
        materialName,
        purchase.quantity,
        parseFloat(purchase.unitPrice),
        parseFloat(purchase.totalAmount),
        purchase.purchaseType,
        parseFloat(purchase.paidAmount || "0"),
        parseFloat(purchase.remainingAmount || "0"),
        parseFloat(purchase.remainingAmount || "0") === 0 ? 'مسدد' : 'مؤجل'
      ];

      rowData.forEach((value, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = value;
        
        // تنسيق الخط
        cell.font = { name: 'Arial', size: 8 };
        
        // تحسين التوسيط والمحاذاة حسب نوع البيانات
        if (colIndex === 0) {
          // رقم التسلسل - توسيط
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        } else if ([1, 2].includes(colIndex)) {
          // التاريخ ورقم الفاتورة - توسيط
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        } else if ([3, 4].includes(colIndex)) {
          // اسم المشروع واسم المادة - محاذاة يمين
          cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
        } else if ([5, 6, 7, 8, 9, 10, 11].includes(colIndex)) {
          // الأرقام والحالة - توسيط
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        } else {
          // افتراضي - توسيط
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        }
        
        // تنسيق الأرقام والعملة
        if ([5, 6, 7, 9, 10, 11].includes(colIndex)) {
          cell.numFmt = '#,##0';
        }

        // تلوين الصفوف
        const bgColor = index % 2 === 0 ? 'f8f9fa' : 'ffffff';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

        // تلوين حالة الدفع (تحديث الفهرس بعد إضافة عمود المشروع)
        if (colIndex === 11) {
          if (value === 'مسدد') {
            cell.font = { ...cell.font, color: { argb: '228b22' }, bold: true };
          } else {
            cell.font = { ...cell.font, color: { argb: 'cc0000' }, bold: true };
          }
        }

        // إضافة حدود
        cell.border = {
          top: { style: 'thin', color: { argb: 'cccccc' } },
          bottom: { style: 'thin', color: { argb: 'cccccc' } },
          left: { style: 'thin', color: { argb: 'cccccc' } },
          right: { style: 'thin', color: { argb: 'cccccc' } }
        };
      });
      
      // ارتفاع تلقائي للصف ليتناسب مع النص الملتف
      row.height = 25; // ارتفاع ثابت
      currentRow++;
    });

    currentRow += 1;

    // =========================
    // ملخص الحساب
    // =========================

    // عنوان الملخص احترافي
    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    const summaryHeaderCell = worksheet.getCell(`A${currentRow}`);
    summaryHeaderCell.value = '💰 ملخص الحساب المالي';
    summaryHeaderCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    summaryHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '70ad47' } };
    summaryHeaderCell.border = {
      top: { style: 'medium', color: { argb: '70ad47' } },
      bottom: { style: 'medium', color: { argb: '70ad47' } },
      left: { style: 'thick', color: { argb: '1f4e79' } },
      right: { style: 'thick', color: { argb: '1f4e79' } }
    };
    worksheet.getRow(currentRow).height = 22;
    currentRow++;

    // إحصائيات الملخص في جدول احترافي
    const summaryItems = [
      { label: 'إجمالي المشتريات', value: formatCurrency(totals.totalAmount), color: '1f4e79' },
      { label: 'إجمالي المدفوع', value: formatCurrency(totals.paidAmount), color: '228b22' },
      { label: 'إجمالي المتبقي', value: formatCurrency(totals.remainingAmount), color: 'cc0000' },
      { label: 'عدد الفواتير', value: purchases.length.toLocaleString('en-GB'SA'), color: '1f4e79' }
    ];

    // إنشاء جدول احترافي للملخص
    const summaryRows = [
      [summaryItems[0], summaryItems[1]],
      [summaryItems[2], summaryItems[3]]
    ];

    summaryRows.forEach(row => {
      const excelRow = worksheet.getRow(currentRow);
      
      row.forEach((item, index) => {
        const startCol = index * 6 + 1; // A=1, G=7
        
        // خلية التسمية
        const labelCell = excelRow.getCell(startCol);
        labelCell.value = item.label;
        labelCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1f4e79' } };
        labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
        labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'e8f5e8' } };
        worksheet.mergeCells(`${String.fromCharCode(64 + startCol)}${currentRow}:${String.fromCharCode(64 + startCol + 2)}${currentRow}`);
        
        // خلية القيمة
        const valueCell = excelRow.getCell(startCol + 3);
        valueCell.value = item.value;
        valueCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: item.color } };
        valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
        valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ffffff' } };
        worksheet.mergeCells(`${String.fromCharCode(64 + startCol + 3)}${currentRow}:${String.fromCharCode(64 + startCol + 5)}${currentRow}`);
        
        // إضافة حدود
        [labelCell, valueCell].forEach(cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'cccccc' } },
            bottom: { style: 'thin', color: { argb: 'cccccc' } },
            left: { style: 'thin', color: { argb: 'cccccc' } },
            right: { style: 'thin', color: { argb: 'cccccc' } }
          };
        });
      });
      
      worksheet.getRow(currentRow).height = 20;
      currentRow++;
    });

    currentRow += 3;

    // =========================
    // تذييل التقرير
    // =========================
    
    // خط فاصل
    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
    const separatorCell = worksheet.getCell(`A${currentRow}`);
    separatorCell.border = { bottom: { style: 'thick', color: { argb: '1f4e79' } } };
    currentRow++;

    // معلومات الشركة في التذييل
    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
    const footerCell = worksheet.getCell(`A${currentRow}`);
    footerCell.value = 'شركة الفتيني للمقاولات والاستشارات الهندسية | تقرير مُنشأ تلقائياً بواسطة نظام إدارة المشاريع';
    footerCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: '666666' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    // معلومات إضافية
    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
    const infoFooterCell = worksheet.getCell(`A${currentRow}`);
    infoFooterCell.value = `تم إنشاء هذا التقرير في ${formatDate(new Date().toISOString())} | إجمالي السجلات: ${purchases.length}`;
    infoFooterCell.font = { name: 'Arial', size: 8, color: { argb: '999999' } };
    infoFooterCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // حفظ الملف
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const currentDate = new Date().toISOString().split('T')[0];
    link.download = `كشف-حساب-${selectedSupplier.name}-${currentDate}.xlsx`;
    link.click();
  };

  const resetFilters = () => {
    setSelectedProjectId("all");
    setSelectedSupplierId("");
    setDateFrom("");
    setDateTo("");
    setPaymentTypeFilter("all");
    setSearchTerm("");
  };

  // تحديد التواريخ تلقائياً عند اختيار مورد
  useEffect(() => {
    if (selectedSupplierId && dateRange) {
      setDateFrom(dateRange.minDate);
      setDateTo(dateRange.maxDate);
    }
  }, [selectedSupplierId, dateRange]);

  return (
    <div className="container mx-auto p-6 space-y-1" dir="rtl">

      {/* الإحصائيات الشاملة - منطقة واحدة للجميع */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {/* الإحصائيات العامة */}
        <StatsCard
          title="إجمالي الموردين"
          value={overallStats.totalSuppliers.toLocaleString('en-US')}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="المشتريات النقدية"
          value={formatCurrency(overallStats.totalCashPurchases)}
          icon={Wallet}
          color="green"
        />
        <StatsCard
          title="المشتريات الآجلة"
          value={formatCurrency(overallStats.totalCreditPurchases)}
          icon={CreditCard}
          color="orange"
        />
        <StatsCard
          title="الموردين النشطين"
          value={overallStats.activeSuppliers.toLocaleString('en-US')}
          icon={Building2}
          color="purple"
        />
        
        {/* الإحصائيات الخاصة بالمورد المحدد */}
        {selectedSupplierId && (
          <>
            <StatsCard
              title="مشتريات المورد (إجمالي)"
              value={formatCurrency(totals.totalAmount)}
              icon={ShoppingCart}
              color="indigo"
            />
            <StatsCard
              title="المدفوع للمورد"
              value={formatCurrency(totals.paidAmount)}
              icon={TrendingUp}
              color="emerald"
            />
            <StatsCard
              title="المتبقي على المورد"
              value={formatCurrency(totals.remainingAmount)}
              icon={TrendingDown}
              color="red"
            />
            <StatsCard
              title="فواتير المورد"
              value={purchases.length.toLocaleString('en-US')}
              icon={Receipt}
              color="amber"
            />
          </>
        )}
      </div>

      {/* فلاتر البحث الموحدة */}
      <div className="mb-6">
        <UnifiedSearchFilter
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="ابحث عن مورد..."
          filters={[
            {
              key: 'supplier',
              label: 'المورد',
              options: filteredSuppliers.map(s => ({
                value: s.id,
                label: `${s.name}${parseFloat(s.totalDebt) > 0 ? ` - ${formatCurrency(s.totalDebt)}` : ''}`
              }))
            },
            {
              key: 'project',
              label: 'المشروع',
              options: [
                { value: 'all', label: 'جميع المشاريع' },
                ...projects.map(p => ({ value: p.id, label: p.name }))
              ]
            },
            {
              key: 'paymentType',
              label: 'نوع الدفع',
              options: [
                { value: 'all', label: 'جميع الأنواع' },
                { value: 'نقد', label: 'نقد' },
                { value: 'أجل', label: 'أجل' }
              ]
            }
          ]}
          filterValues={{
            supplier: selectedSupplierId,
            project: selectedProjectId,
            paymentType: paymentTypeFilter
          }}
          onFilterChange={(key, value) => {
            switch(key) {
              case 'supplier': setSelectedSupplierId(value); break;
              case 'project': setSelectedProjectId(value); break;
              case 'paymentType': setPaymentTypeFilter(value); break;
            }
          }}
          onReset={resetFilters}
        />
        <div className="mt-3">
          <Button
            onClick={exportToExcel}
            disabled={!selectedSupplierId || purchases.length === 0}
            className="w-full md:w-auto"
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* معلومات المورد المحدد - مضغوطة */}
      {selectedSupplier && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4" />
              معلومات المورد
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Building2 className="w-3 h-3" />
                  اسم المورد
                </div>
                <p className="font-semibold text-sm">{selectedSupplier.name}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Users className="w-3 h-3" />
                  المسؤول
                </div>
                <p className="font-medium text-sm">{selectedSupplier.contactPerson || "غير محدد"}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Phone className="w-3 h-3" />
                  الهاتف
                </div>
                <p className="font-medium text-sm" dir="ltr">{selectedSupplier.phone || "غير محدد"}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Wallet className="w-3 h-3" />
                  المديونية
                </div>
                <p className="font-bold text-red-600 text-sm">
                  {selectedSupplierId ? formatCurrency(overallStats.remainingDebt) : formatCurrency(selectedSupplier.totalDebt)}
                </p>
              </div>
            </div>

            {selectedSupplier.address && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <MapPin className="w-3 h-3" />
                  العنوان
                </div>
                <p className="text-gray-800 text-sm">{selectedSupplier.address}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* تفاصيل المشتريات */}
      {selectedSupplierId && (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              تفاصيل المشتريات
              {selectedProject && (
                <Badge variant="outline" className="mr-2">
                  {selectedProject.name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPurchases ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600">جاري تحميل البيانات...</p>
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-gray-500 text-lg">لا توجد مشتريات للمورد المحدد</p>
                <p className="text-gray-400">جرب تغيير فلاتر البحث أو التواريخ</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* عرض البطاقات المضغوطة */}
                <div className="grid gap-3">
                  {purchases.map((purchase, index) => (
                    <div 
                      key={purchase.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* الصف الأول: التاريخ ورقم الفاتورة والحالة */}
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900" dir="ltr">
                              {formatDate(purchase.invoiceDate)}
                            </span>
                          </div>
                          {purchase.invoiceNumber && (
                            <div className="flex items-center gap-2 mt-1">
                              <Receipt className="w-4 h-4 text-gray-500" />
                              <span className="text-xs text-gray-600">
                                فاتورة: {purchase.invoiceNumber}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getPaymentStatusBadge(purchase.purchaseType, purchase.remainingAmount || "0")}
                          <Badge 
                            variant={purchase.purchaseType === "نقد" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {purchase.purchaseType}
                          </Badge>
                        </div>
                      </div>

                      {/* الصف الثاني: معلومات المشروع والمادة */}
                      <div className="space-y-2">
                        {/* معلومات المشروع */}
                        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">
                            {projects.find(p => p.id === purchase.projectId)?.name || 'غير محدد'}
                          </span>
                        </div>

                        {/* معلومات المادة */}
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                          <Package className="w-4 h-4 text-blue-500" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">
                              {(purchase as any).materialName || (purchase as any).material?.name || purchase.materialId}
                            </span>
                            <div className="text-xs text-gray-600 mt-1" dir="ltr">
                              الكمية: {purchase.quantity} | سعر الوحدة: {formatCurrency(purchase.unitPrice)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* الصف الثالث: المبالغ المالية */}
                      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                        <div className="text-center">
                          <div className="text-xs text-gray-500">المبلغ الإجمالي</div>
                          <div className="text-sm font-bold text-blue-600" dir="ltr">
                            {formatCurrency(purchase.totalAmount)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">المدفوع</div>
                          <div className="text-sm font-bold text-green-600" dir="ltr">
                            {formatCurrency(purchase.paidAmount || "0")}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">المتبقي</div>
                          <div className="text-sm font-bold text-red-600" dir="ltr">
                            {formatCurrency(purchase.remainingAmount || "0")}
                          </div>
                        </div>
                      </div>

                      {/* ملاحظات إضافية إذا وجدت */}
                      {purchase.notes && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <div className="text-xs text-gray-500">ملاحظات:</div>
                          <div className="text-xs text-gray-700 bg-yellow-50 p-2 rounded">
                            {purchase.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* ملخص الحساب بنظام الإحصائيات الموحد */}
                <StatsGrid className="mt-4">
                  <StatsCard 
                    title="إجمالي المشتريات" 
                    value={totals.totalAmount} 
                    icon={DollarSign}
                    color="blue"
                    format="currency"
                    trend={{ value: 0, isPositive: true }}
                  />
                  <StatsCard 
                    title="عدد الفواتير" 
                    value={purchases.length} 
                    icon={Receipt}
                    color="gray"
                    trend={{ value: 0, isPositive: true }}
                  />
                  <StatsCard 
                    title="إجمالي المدفوع" 
                    value={totals.paidAmount} 
                    icon={CreditCard}
                    color="green"
                    format="currency"
                    trend={{ value: 0, isPositive: true }}
                  />
                  <StatsCard 
                    title="إجمالي المتبقي" 
                    value={totals.remainingAmount} 
                    icon={AlertCircle}
                    color="red"
                    format="currency"
                    trend={{ value: 0, isPositive: false }}
                  />
                </StatsGrid>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* حالة فارغة عندما لا يوجد مورد محدد */}
      {!selectedSupplierId && (
        <Card className="shadow-sm">
          <CardContent className="text-center py-12">
            <Eye className="w-16 h-16 text-gray-400 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-600">اختر مورداً لعرض حسابه</h3>
            <p className="text-gray-500">
              استخدم فلاتر البحث أعلاه لاختيار مورد وعرض تفاصيل حسابه ومشترياته
            </p>
            {isLoadingSuppliers ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500">جاري تحميل الموردين...</p>
              </div>
            ) : suppliers.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  لا يوجد موردين مسجلين في النظام. يرجى إضافة الموردين أولاً من صفحة إدارة الموردين.
                </AlertDescription>
              </Alert>
            ) : suppliersError ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  حدث خطأ في تحميل بيانات الموردين. يرجى تحديث الصفحة أو المحاولة مرة أخرى.
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}