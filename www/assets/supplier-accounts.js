const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-BD1Qzn1x.js","assets/index.css"])))=>i.map(i=>d[i]);
import { r as reactExports, c as useFloatingButton, d as useSelectedProject, a as useToast, f as useQuery, h as useFinancialSummary, U as Users, W as Wallet, C as CreditCard, Z as CircleAlert, a0 as Package, D as DollarSign, a1 as ShoppingCart, T as TrendingUp, a2 as TrendingDown, a3 as Receipt, a4 as FileText, j as jsxRuntimeExports, i as UnifiedFilterDashboard, k as Download, o as UnifiedCard, v as Phone, $ as MapPin, a5 as Building2, l as Card, m as CardContent, n as UnifiedCardGrid, s as Calendar, p as Pen, q as Trash2, V as apiRequest, _ as __vitePreload, R as downloadExcelFile } from "./index-BD1Qzn1x.js";
function SupplierAccountsPage() {
  const [selectedSupplierId, setSelectedSupplierId] = reactExports.useState("all");
  const [dateFrom, setDateFrom] = reactExports.useState("");
  const [dateTo, setDateTo] = reactExports.useState("");
  const [searchTerm, setSearchTerm] = reactExports.useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = reactExports.useState("all");
  const [isRefreshing, setIsRefreshing] = reactExports.useState(false);
  const { setFloatingAction } = useFloatingButton();
  const { selectedProjectId, getProjectIdForApi } = useSelectedProject();
  const { toast } = useToast();
  reactExports.useEffect(() => {
    setFloatingAction(null);
    return () => setFloatingAction(null);
  }, [setFloatingAction]);
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/projects", "GET");
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
      }
    }
  });
  const { data: suppliers = [], isLoading: isLoadingSuppliers, error: suppliersError } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suppliers", "GET");
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        return [];
      }
    },
    staleTime: 6e4,
    refetchOnWindowFocus: false
  });
  const { data: dateRange } = useQuery({
    queryKey: ["/api/material-purchases/date-range"],
    staleTime: 3e5
  });
  const filteredSuppliers = Array.isArray(suppliers) ? suppliers.filter(
    (supplier) => supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];
  const { data: purchases = [], isLoading: isLoadingPurchases } = useQuery({
    queryKey: ["/api/material-purchases", selectedProjectId, selectedSupplierId, dateFrom, dateTo, paymentTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSupplierId && selectedSupplierId !== "all") {
        params.append("supplierId", selectedSupplierId);
      }
      const projectIdForApi = getProjectIdForApi();
      if (projectIdForApi) params.append("projectId", projectIdForApi);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (paymentTypeFilter && paymentTypeFilter !== "all") {
        const normalizedType = paymentTypeFilter === "أجل" ? "آجل" : paymentTypeFilter;
        params.append("purchaseType", normalizedType);
      }
      try {
        const allPurchases = await apiRequest(`/api/material-purchases?${params.toString()}`);
        const data = allPurchases.data || allPurchases || [];
        let filteredData = Array.isArray(data) ? data : [];
        if (paymentTypeFilter && paymentTypeFilter !== "all") {
          const normalizedFilter = paymentTypeFilter === "أجل" ? "آجل" : paymentTypeFilter;
          filteredData = filteredData.filter((purchase) => {
            const purchaseType = purchase.purchaseType?.replace(/['"]/g, "") || "";
            return purchaseType === normalizedFilter || normalizedFilter === "آجل" && (purchaseType === "أجل" || purchaseType === "آجل");
          });
        }
        return filteredData;
      } catch (error) {
        console.error("خطأ في جلب المشتريات:", error);
        return [];
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 3e4
  });
  const { data: globalStats } = useQuery({
    queryKey: ["/api/suppliers/statistics"],
    queryFn: async () => {
      return {
        totalSuppliers: 0,
        totalCashPurchases: "0",
        totalCreditPurchases: "0",
        totalDebt: "0",
        totalPaid: "0",
        remainingDebt: "0",
        activeSuppliers: 0
      };
    },
    enabled: false
    // تعطيل هذا الاستعلام لتوحيد المصدر
  });
  const { data: supplierStats } = useQuery({
    queryKey: ["/api/suppliers/statistics", selectedProjectId, selectedSupplierId, dateFrom, dateTo, paymentTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSupplierId && selectedSupplierId !== "all") {
        params.append("supplierId", selectedSupplierId);
      }
      const projectIdForApi = getProjectIdForApi();
      if (projectIdForApi) params.append("projectId", projectIdForApi);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (paymentTypeFilter && paymentTypeFilter !== "all") {
        const normalizedType = paymentTypeFilter === "أجل" ? "آجل" : paymentTypeFilter;
        params.append("purchaseType", normalizedType);
      }
      try {
        const result = await apiRequest(`/api/suppliers/statistics?${params.toString()}`);
        return result.data || result || {
          totalSuppliers: 0,
          totalCashPurchases: "0",
          totalCreditPurchases: "0",
          totalDebt: "0",
          totalPaid: "0",
          remainingDebt: "0",
          activeSuppliers: 0
        };
      } catch (error) {
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
    },
    refetchOnWindowFocus: false,
    staleTime: 3e4
  });
  const selectedSupplier = selectedSupplierId && selectedSupplierId !== "all" ? suppliers.find((s) => s.id === selectedSupplierId) : null;
  const totals = Array.isArray(purchases) ? purchases.reduce((acc, purchase) => {
    acc.totalAmount += parseFloat(purchase.totalAmount || "0");
    acc.paidAmount += parseFloat(purchase.paidAmount || "0");
    acc.remainingAmount += parseFloat(purchase.remainingAmount || "0");
    return acc;
  }, { totalAmount: 0, paidAmount: 0, remainingAmount: 0 }) : { totalAmount: 0, paidAmount: 0, remainingAmount: 0 };
  const { summary, isLoading: isLoadingSummary } = useFinancialSummary();
  const isFiltered = selectedSupplierId && selectedSupplierId !== "all" || selectedProjectId && selectedProjectId !== "all" || dateFrom || dateTo || paymentTypeFilter && paymentTypeFilter !== "all" || searchTerm;
  const overallStats = {
    totalSuppliers: suppliers.length,
    totalCashPurchases: isFiltered ? Array.isArray(purchases) ? purchases.filter((p) => p.purchaseType === "نقد").reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0).toString() : "0" : (summary?.totalCashMaterials || "0").toString(),
    totalCreditPurchases: isFiltered ? Array.isArray(purchases) ? purchases.filter((p) => p.purchaseType === "آجل" || p.purchaseType === "أجل").reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0).toString() : "0" : (summary?.totalCreditMaterials || "0").toString(),
    totalDebt: summary?.totalSuppliersDebt || "0",
    totalPaid: summary?.totalSuppliersPaid || "0",
    remainingDebt: summary?.totalSuppliersDebt || "0",
    activeSuppliers: suppliers.filter((s) => parseFloat(s.totalDebt || "0") > 0).length,
    totalPurchases: Array.isArray(purchases) ? purchases.length : 0
  };
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  };
  const formatCurrency = (amount) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return num.toLocaleString("en-US") + " ريال";
  };
  const exportToExcel = async () => {
    if (purchases.length === 0) return;
    const ExcelJS = (await __vitePreload(async () => {
      const { default: __vite_default__ } = await import("./index-BD1Qzn1x.js").then((n) => n.e);
      return { default: __vite_default__ };
    }, true ? __vite__mapDeps([0,1]) : void 0)).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("كشف حساب المورد");
    worksheet.views = [{ rightToLeft: true }];
    worksheet.pageSetup = {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 },
      horizontalCentered: true,
      scale: 80
    };
    worksheet.columns = [
      { width: 3 },
      { width: 9 },
      { width: 12 },
      { width: 16 },
      { width: 20 },
      { width: 6 },
      { width: 9 },
      { width: 11 },
      { width: 8 },
      { width: 9 },
      { width: 9 },
      { width: 8 }
    ];
    let currentRow = 1;
    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = "شركة الفتيني للمقاولات والاستشارات الهندسية";
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFF" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1f4e79" } };
    worksheet.getRow(currentRow).height = 25;
    currentRow++;
    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    const subtitleCell = worksheet.getCell(`A${currentRow}`);
    subtitleCell.value = "كشف حساب المورد - تقرير مفصل";
    subtitleCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "1f4e79" } };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
    subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "f2f2f2" } };
    worksheet.getRow(currentRow).height = 16;
    currentRow += 2;
    if (selectedSupplier) {
      worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
      const supplierHeaderCell = worksheet.getCell(`A${currentRow}`);
      supplierHeaderCell.value = "بيانات المورد";
      supplierHeaderCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFF" } };
      supplierHeaderCell.alignment = { horizontal: "center", vertical: "middle" };
      supplierHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2e75b6" } };
      worksheet.getRow(currentRow).height = 22;
      currentRow++;
      const supplierData = [
        ["اسم المورد", selectedSupplier.name, "رقم الهاتف", selectedSupplier.phone || "غير محدد"],
        ["شخص الاتصال", selectedSupplier.contactPerson || "غير محدد", "العنوان", selectedSupplier.address || "غير محدد"]
      ];
      supplierData.forEach((dataRow) => {
        const row = worksheet.getRow(currentRow);
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        row.getCell(1).value = dataRow[0];
        row.getCell(1).font = { name: "Arial", size: 9, bold: true };
        row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.mergeCells(`C${currentRow}:F${currentRow}`);
        row.getCell(3).value = dataRow[1];
        row.getCell(3).font = { name: "Arial", size: 9 };
        row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.mergeCells(`G${currentRow}:H${currentRow}`);
        row.getCell(7).value = dataRow[2];
        row.getCell(7).font = { name: "Arial", size: 9, bold: true };
        row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.mergeCells(`I${currentRow}:L${currentRow}`);
        row.getCell(9).value = dataRow[3];
        row.getCell(9).font = { name: "Arial", size: 9 };
        row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(currentRow).height = 18;
        currentRow++;
      });
      currentRow += 1;
    }
    const headers = ["#", "التاريخ", "رقم الفاتورة", "اسم المشروع", "المادة", "الكمية", "سعر الوحدة", "المبلغ الإجمالي", "نوع الدفع", "المدفوع", "المتبقي", "الحالة"];
    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1f4e79" } };
    });
    headerRow.height = 20;
    currentRow++;
    purchases.forEach((purchase, index) => {
      const row = worksheet.getRow(currentRow);
      const projectName = projects.find((p) => p.id === purchase.projectId)?.name || "غير محدد";
      const materialName = purchase.materialName || "غير محدد";
      const rowData = [
        index + 1,
        formatDate(purchase.invoiceDate || purchase.purchaseDate),
        purchase.invoiceNumber || "-",
        projectName,
        materialName,
        purchase.quantity,
        parseFloat(purchase.unitPrice),
        parseFloat(purchase.totalAmount),
        purchase.purchaseType,
        parseFloat(purchase.paidAmount || "0"),
        parseFloat(purchase.remainingAmount || "0"),
        parseFloat(purchase.remainingAmount || "0") === 0 ? "مسدد" : "مؤجل"
      ];
      rowData.forEach((value, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = value;
        cell.font = { name: "Arial", size: 8 };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "cccccc" } },
          bottom: { style: "thin", color: { argb: "cccccc" } },
          left: { style: "thin", color: { argb: "cccccc" } },
          right: { style: "thin", color: { argb: "cccccc" } }
        };
      });
      worksheet.getRow(currentRow).height = 18;
      currentRow++;
    });
    currentRow += 2;
    const summaryData = [
      ["إجمالي المشتريات", formatCurrency(totals.totalAmount)],
      ["إجمالي المدفوع", formatCurrency(totals.paidAmount)],
      ["إجمالي المتبقي", formatCurrency(totals.remainingAmount)]
    ];
    summaryData.forEach((data) => {
      const row = worksheet.getRow(currentRow);
      worksheet.mergeCells(`H${currentRow}:I${currentRow}`);
      row.getCell(8).value = data[0];
      row.getCell(8).font = { name: "Arial", size: 10, bold: true };
      row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`J${currentRow}:L${currentRow}`);
      row.getCell(10).value = data[1];
      row.getCell(10).font = { name: "Arial", size: 10, bold: true };
      row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
      worksheet.getRow(currentRow).height = 20;
      currentRow++;
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const currentDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const fileName = selectedSupplier ? `كشف-حساب-${selectedSupplier.name}-${currentDate}.xlsx` : `كشف-حساب-جميع-الموردين-${currentDate}.xlsx`;
    await downloadExcelFile(buffer, fileName);
  };
  const resetFilters = reactExports.useCallback(() => {
    setSelectedSupplierId("all");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
    setPaymentTypeFilter("all");
  }, []);
  const handleRefresh = reactExports.useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);
  reactExports.useEffect(() => {
    if (selectedSupplierId && dateRange) {
      setDateFrom(dateRange.minDate);
      setDateTo(dateRange.maxDate);
    }
  }, [selectedSupplierId, dateRange]);
  const statsRowsConfig = reactExports.useMemo(() => [
    {
      columns: 3,
      gap: "sm",
      items: [
        {
          key: "totalSuppliers",
          label: "إجمالي الموردين",
          value: overallStats.totalSuppliers.toString(),
          icon: Users,
          color: "blue"
        },
        {
          key: "cashPurchases",
          label: "المشتريات النقدية",
          value: formatCurrency(overallStats.totalCashPurchases),
          icon: Wallet,
          color: "green"
        },
        {
          key: "creditPurchases",
          label: "المشتريات الآجلة",
          value: formatCurrency(overallStats.totalCreditPurchases),
          icon: CreditCard,
          color: "orange"
        },
        {
          key: "remainingDebt",
          label: "إجمالي المديونية",
          value: formatCurrency(overallStats.remainingDebt),
          icon: CircleAlert,
          color: "red"
        },
        {
          key: "activeSuppliers",
          label: "موردين نشطين",
          value: overallStats.activeSuppliers.toString(),
          icon: Package,
          color: "purple"
        },
        {
          key: "totalPaid",
          label: "إجمالي المدفوع",
          value: formatCurrency(overallStats.totalPaid),
          icon: DollarSign,
          color: "emerald"
        }
      ]
    },
    ...selectedSupplierId && selectedSupplierId !== "all" ? [{
      columns: 3,
      gap: "sm",
      items: [
        {
          key: "supplierTotal",
          label: "مشتريات المورد",
          value: formatCurrency(totals.totalAmount),
          icon: ShoppingCart,
          color: "purple"
        },
        {
          key: "supplierPaid",
          label: "المدفوع للمورد",
          value: formatCurrency(totals.paidAmount),
          icon: TrendingUp,
          color: "green"
        },
        {
          key: "supplierRemaining",
          label: "المتبقي على المورد",
          value: formatCurrency(totals.remainingAmount),
          icon: TrendingDown,
          color: "red"
        },
        {
          key: "supplierInvoices",
          label: "عدد الفواتير",
          value: purchases.length.toString(),
          icon: Receipt,
          color: "blue"
        },
        {
          key: "averageInvoice",
          label: "متوسط الفاتورة",
          value: formatCurrency(purchases.length > 0 ? totals.totalAmount / purchases.length : 0),
          icon: FileText,
          color: "amber"
        },
        {
          key: "paymentProgress",
          label: "نسبة السداد",
          value: totals.totalAmount > 0 ? `${(totals.paidAmount / totals.totalAmount * 100).toFixed(1)}%` : "0%",
          icon: TrendingUp,
          color: "teal"
        }
      ]
    }] : []
  ], [overallStats, totals, purchases.length, selectedSupplierId, formatCurrency]);
  const filtersConfig = reactExports.useMemo(() => [
    {
      key: "supplier",
      label: "المورد",
      type: "select",
      placeholder: "اختر المورد",
      options: [
        { value: "all", label: "جميع الموردين" },
        ...filteredSuppliers.map((s) => ({
          value: s.id,
          label: `${s.name}${parseFloat(s.totalDebt) > 0 ? ` - ${formatCurrency(s.totalDebt)}` : ""}`
        }))
      ]
    },
    {
      key: "paymentType",
      label: "نوع الدفع",
      type: "select",
      placeholder: "نوع الدفع",
      options: [
        { value: "all", label: "جميع الأنواع" },
        { value: "نقد", label: "نقد" },
        { value: "أجل", label: "أجل" }
      ]
    }
  ], [filteredSuppliers, formatCurrency]);
  const handleFilterChange = reactExports.useCallback((key, value) => {
    if (key === "supplier") {
      setSelectedSupplierId(value);
    } else if (key === "paymentType") {
      setPaymentTypeFilter(value);
    }
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", dir: "rtl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      UnifiedFilterDashboard,
      {
        statsRows: statsRowsConfig,
        searchValue: searchTerm,
        onSearchChange: setSearchTerm,
        searchPlaceholder: "ابحث عن مورد...",
        showSearch: true,
        filters: filtersConfig,
        filterValues: {
          supplier: selectedSupplierId,
          paymentType: paymentTypeFilter
        },
        onFilterChange: handleFilterChange,
        onReset: resetFilters,
        onRefresh: handleRefresh,
        isRefreshing,
        actions: [
          {
            key: "export",
            label: "تصدير",
            icon: Download,
            onClick: exportToExcel,
            disabled: purchases.length === 0
          }
        ]
      }
    ),
    selectedSupplier && /* @__PURE__ */ jsxRuntimeExports.jsx(
      UnifiedCard,
      {
        title: selectedSupplier.name,
        subtitle: "معلومات المورد",
        titleIcon: Building2,
        headerColor: "#3b82f6",
        fields: [
          {
            label: "المسؤول",
            value: selectedSupplier.contactPerson || "غير محدد",
            icon: Users,
            color: "default"
          },
          {
            label: "الهاتف",
            value: selectedSupplier.phone || "غير محدد",
            icon: Phone,
            color: "info"
          },
          {
            label: "العنوان",
            value: selectedSupplier.address || "غير محدد",
            icon: MapPin,
            color: "default"
          },
          {
            label: "المديونية",
            value: formatCurrency(overallStats.remainingDebt),
            icon: Wallet,
            color: "danger",
            emphasis: true
          }
        ],
        compact: true
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: isLoadingPurchases ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "text-center py-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 mt-2", children: "جاري تحميل البيانات..." })
    ] }) }) : purchases.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "text-center py-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-12 h-12 text-gray-400 mx-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-500 text-lg mt-2", children: "لا توجد مشتريات" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-400 text-sm", children: "جرب تغيير فلاتر البحث أو أضف مشتريات جديدة" })
    ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(UnifiedCardGrid, { columns: 2, children: purchases.map((purchase) => {
      const projectName = projects.find((p) => p.id === purchase.projectId)?.name || "غير محدد";
      const materialName = purchase.materialName || "غير محدد";
      const supplierName = purchase.supplierName || suppliers.find((s) => s.id === purchase.supplierId)?.name || "غير محدد";
      const remaining = parseFloat(purchase.remainingAmount || "0");
      const invoiceDateStr = purchase.invoiceDate || purchase.purchaseDate;
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        UnifiedCard,
        {
          title: materialName,
          subtitle: projectName,
          titleIcon: Package,
          headerColor: remaining === 0 ? "#22c55e" : purchase.purchaseType === "نقد" ? "#3b82f6" : "#ef4444",
          badges: [
            {
              label: remaining === 0 ? "مسدد" : "مؤجل",
              variant: remaining === 0 ? "success" : "destructive"
            },
            {
              label: purchase.purchaseType,
              variant: purchase.purchaseType === "نقد" ? "default" : "warning"
            }
          ],
          actions: [
            {
              icon: Pen,
              label: "تعديل",
              onClick: () => {
                window.location.href = `/material-purchase?edit=${purchase.id}`;
              },
              color: "blue"
            },
            {
              icon: Trash2,
              label: "حذف",
              onClick: async () => {
                if (confirm("هل أنت متأكد من حذف هذه المشترى؟")) {
                  try {
                    await apiRequest(`/api/material-purchases/${purchase.id}`, "DELETE");
                    await queryClient.invalidateQueries({ queryKey: ["/api/material-purchases"] });
                    await queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
                    await queryClient.invalidateQueries({ queryKey: ["/api/suppliers/statistics"] });
                    toast({
                      title: "✅ تم الحذف",
                      description: "تم حذف المشترى بنجاح"
                    });
                  } catch (error) {
                    toast({
                      title: "❌ خطأ",
                      description: "فشل حذف المشترى",
                      variant: "destructive"
                    });
                  }
                }
              },
              color: "red"
            }
          ],
          fields: [
            {
              label: "المورد",
              value: supplierName,
              icon: Building2,
              color: "info"
            },
            {
              label: "رقم الفاتورة",
              value: purchase.invoiceNumber || "بدون رقم",
              icon: Receipt,
              color: "default"
            },
            {
              label: "التاريخ",
              value: formatDate(invoiceDateStr),
              icon: Calendar,
              color: "muted"
            },
            {
              label: "الكمية",
              value: `${purchase.quantity} × ${formatCurrency(purchase.unitPrice)}`,
              icon: Package,
              color: "default"
            },
            {
              label: "المبلغ الإجمالي",
              value: formatCurrency(purchase.totalAmount),
              icon: DollarSign,
              color: "info",
              emphasis: true
            },
            {
              label: "المدفوع",
              value: formatCurrency(
                purchase.purchaseType === "نقد" ? purchase.totalAmount : purchase.paidAmount || "0"
              ),
              icon: TrendingUp,
              color: "success"
            },
            {
              label: "المتبقي",
              value: formatCurrency(
                purchase.purchaseType === "نقد" ? 0 : purchase.remainingAmount || "0"
              ),
              icon: TrendingDown,
              color: (purchase.purchaseType === "نقد" ? 0 : remaining) > 0 ? "danger" : "success",
              emphasis: true
            }
          ],
          footer: purchase.notes ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "line-clamp-2 text-amber-800 dark:text-amber-200", children: purchase.notes }) }) : void 0,
          compact: true
        },
        purchase.id
      );
    }) }) })
  ] });
}
export {
  SupplierAccountsPage as default
};
