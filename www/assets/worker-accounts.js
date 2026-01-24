const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-BeuLVmQp.js","assets/index.css"])))=>i.map(i=>d[i]);
import { u as useLocation, r as reactExports, a as useToast, b as useQueryClient, c as useFloatingButton, d as useSelectedProject, f as useQuery, g as useMutation, h as useFinancialSummary, S as Send, D as DollarSign, U as Users, W as Wallet, C as CreditCard, T as TrendingUp, j as jsxRuntimeExports, i as UnifiedFilterDashboard, k as Download, l as Card, m as CardContent, B as Button, P as Plus, n as UnifiedCardGrid, o as UnifiedCard, p as Pen, q as Trash2, s as Calendar, t as User, v as Phone, w as Dialog, x as DialogContent, y as DialogHeader, z as DialogTitle, A as DialogDescription, L as Label, E as WorkerSelect, F as ProjectSelect, I as Input, G as DatePickerField, H as format, J as AutocompleteInput, K as Select, M as SelectTrigger, N as SelectValue, O as SelectContent, Q as SelectItem, _ as __vitePreload, R as downloadExcelFile, V as apiRequest } from "./index-BeuLVmQp.js";
function WorkerAccountsPage() {
  useLocation();
  const [showTransferDialog, setShowTransferDialog] = reactExports.useState(false);
  const [editingTransfer, setEditingTransfer] = reactExports.useState(null);
  const [searchTerm, setSearchTerm] = reactExports.useState("");
  const [selectedWorkerId, setSelectedWorkerId] = reactExports.useState("all");
  const [transferMethodFilter, setTransferMethodFilter] = reactExports.useState("all");
  const [dateFrom, setDateFrom] = reactExports.useState("");
  const [dateTo, setDateTo] = reactExports.useState("");
  const [specificDate, setSpecificDate] = reactExports.useState("");
  const [isRefreshing, setIsRefreshing] = reactExports.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const { selectedProjectId, getProjectIdForApi } = useSelectedProject();
  const selectedProject = getProjectIdForApi() || "";
  const saveAutocompleteValue = async (field, value) => {
    if (!value || value.trim().length < 2) return;
    try {
      await apiRequest("/api/autocomplete", "POST", {
        category: field,
        value: value.trim(),
        usageCount: 1
      });
    } catch (error) {
      console.error(`خطأ في حفظ قيمة الإكمال التلقائي ${field}:`, error);
    }
  };
  const [formData, setFormData] = reactExports.useState({
    workerId: "",
    projectId: "",
    amount: 0,
    recipientName: "",
    recipientPhone: "",
    transferMethod: "hawaleh",
    transferNumber: "",
    transferDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    notes: ""
  });
  const saveAllTransferAutocompleteValues = async () => {
    const promises = [];
    if (formData.recipientName && formData.recipientName.trim().length >= 2) {
      promises.push(saveAutocompleteValue("recipientNames", formData.recipientName));
    }
    if (formData.recipientPhone && formData.recipientPhone.trim().length >= 3) {
      promises.push(saveAutocompleteValue("recipientPhones", formData.recipientPhone));
    }
    if (formData.transferNumber && formData.transferNumber.trim().length >= 1) {
      promises.push(saveAutocompleteValue("workerTransferNumbers", formData.transferNumber));
    }
    if (formData.notes && formData.notes.trim().length >= 2) {
      promises.push(saveAutocompleteValue("workerTransferNotes", formData.notes));
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  };
  const urlParams = new URLSearchParams(window.location.search);
  const editTransferId = urlParams.get("edit");
  const preselectedWorker = urlParams.get("worker");
  const { data: workers = [], isLoading: isLoadingWorkers } = useQuery({
    queryKey: ["/api/workers"],
    select: (data) => Array.isArray(data) ? data.filter((w) => w.isActive) : []
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    select: (data) => Array.isArray(data) ? data : []
  });
  const { data: transfers = [], isLoading: isLoadingTransfers } = useQuery({
    queryKey: ["/api/worker-transfers", selectedProjectId],
    queryFn: async () => {
      const url = selectedProject ? `/api/worker-transfers?projectId=${selectedProject}` : "/api/worker-transfers";
      const response = await apiRequest(url, "GET");
      return Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
    }
  });
  reactExports.useEffect(() => {
    const handleAddNew = () => {
      setEditingTransfer(null);
      setFormData({
        workerId: preselectedWorker || "",
        projectId: "",
        amount: 0,
        recipientName: "",
        recipientPhone: "",
        transferMethod: "hawaleh",
        transferNumber: "",
        transferDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        notes: ""
      });
      setShowTransferDialog(true);
    };
    setFloatingAction(handleAddNew, "إضافة حولة جديدة");
    return () => {
      setFloatingAction(null);
    };
  }, [setFloatingAction, preselectedWorker]);
  const createTransferMutation = useMutation({
    mutationFn: async (data) => {
      await saveAllTransferAutocompleteValues();
      return apiRequest("/api/worker-transfers", "POST", data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/worker-transfers", selectedProjectId] });
      queryClient.refetchQueries({ queryKey: ["/api/autocomplete"] });
      setShowTransferDialog(false);
      resetForm();
      toast({
        title: "تم بنجاح",
        description: "تم إرسال الحولة بنجاح"
      });
    },
    onError: async (error) => {
      await saveAllTransferAutocompleteValues();
      queryClient.refetchQueries({ queryKey: ["/api/autocomplete"] });
      let errorMessage = "فشل في إرسال الحولة";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });
  const updateTransferMutation = useMutation({
    mutationFn: async (data) => {
      await saveAllTransferAutocompleteValues();
      return apiRequest(`/api/worker-transfers/${data.id}`, "PATCH", data.updates);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/worker-transfers", selectedProjectId] });
      queryClient.refetchQueries({ queryKey: ["/api/autocomplete"] });
      setShowTransferDialog(false);
      setEditingTransfer(null);
      resetForm();
      toast({
        title: "تم بنجاح",
        description: "تم تحديث الحولة بنجاح"
      });
    },
    onError: async (error) => {
      await saveAllTransferAutocompleteValues();
      queryClient.refetchQueries({ queryKey: ["/api/autocomplete"] });
      let errorMessage = "فشل في تحديث الحولة";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });
  const deleteTransferMutation = useMutation({
    mutationFn: async (id) => {
      return apiRequest(`/api/worker-transfers/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/worker-transfers", selectedProjectId] });
      toast({
        title: "تم بنجاح",
        description: "تم حذف الحولة بنجاح"
      });
    },
    onError: (error) => {
      let errorMessage = "فشل في حذف الحولة";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });
  reactExports.useEffect(() => {
    if (editTransferId && transfers.length > 0) {
      const transfer = transfers.find((t) => t.id === editTransferId);
      if (transfer) {
        setEditingTransfer(transfer);
        setFormData({
          workerId: transfer.workerId,
          projectId: transfer.projectId,
          amount: transfer.amount,
          recipientName: transfer.recipientName,
          recipientPhone: transfer.recipientPhone || "",
          transferMethod: transfer.transferMethod,
          transferNumber: transfer.transferNumber || "",
          transferDate: transfer.transferDate,
          notes: transfer.notes || ""
        });
        setShowTransferDialog(true);
      }
    }
  }, [editTransferId, transfers]);
  const resetForm = () => {
    setFormData({
      workerId: "",
      projectId: "",
      amount: 0,
      recipientName: "",
      recipientPhone: "",
      transferMethod: "hawaleh",
      transferNumber: "",
      transferDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      notes: ""
    });
  };
  const handleSubmit = () => {
    if (!formData.workerId || !formData.projectId || !formData.amount || !formData.recipientName || !formData.transferDate) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }
    if (editingTransfer) {
      updateTransferMutation.mutate({
        id: editingTransfer.id,
        updates: formData
      });
    } else {
      createTransferMutation.mutate(formData);
    }
  };
  const handleEdit = (transfer) => {
    setEditingTransfer(transfer);
    setFormData({
      workerId: transfer.workerId,
      projectId: transfer.projectId,
      amount: transfer.amount,
      recipientName: transfer.recipientName,
      recipientPhone: transfer.recipientPhone || "",
      transferMethod: transfer.transferMethod,
      transferNumber: transfer.transferNumber || "",
      transferDate: transfer.transferDate,
      notes: transfer.notes || ""
    });
    setShowTransferDialog(true);
  };
  const formatCurrency = (amount) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `${num.toLocaleString("en-US")} ر.ي`;
  };
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  };
  const getTransferMethodLabel = (method) => {
    switch (method) {
      case "cash":
        return "نقداً";
      case "bank":
        return "تحويل بنكي";
      case "hawaleh":
        return "حولة";
      default:
        return method;
    }
  };
  const filteredTransfers = reactExports.useMemo(() => {
    let result = [...transfers];
    if (selectedProject && selectedProject !== "all") {
      result = result.filter((t) => t.projectId === selectedProject);
    }
    if (selectedWorkerId && selectedWorkerId !== "all") {
      result = result.filter((t) => t.workerId === selectedWorkerId);
    }
    if (transferMethodFilter && transferMethodFilter !== "all") {
      result = result.filter((t) => t.transferMethod === transferMethodFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((t) => {
        const worker = workers.find((w) => w.id === t.workerId);
        return worker?.name.toLowerCase().includes(term) || t.recipientName.toLowerCase().includes(term) || t.notes?.toLowerCase().includes(term);
      });
    }
    if (dateFrom) {
      result = result.filter((t) => new Date(t.transferDate) >= new Date(dateFrom));
    }
    if (dateTo) {
      result = result.filter((t) => new Date(t.transferDate) <= new Date(dateTo));
    }
    if (specificDate) {
      result = result.filter((t) => {
        const tDate = new Date(t.transferDate);
        const sDate = new Date(specificDate);
        return tDate.getFullYear() === sDate.getFullYear() && tDate.getMonth() === sDate.getMonth() && tDate.getDate() === sDate.getDate();
      });
    }
    return result;
  }, [transfers, selectedProject, selectedWorkerId, transferMethodFilter, searchTerm, dateFrom, dateTo, specificDate, workers]);
  const { summary, isLoading: isLoadingSummary } = useFinancialSummary();
  const stats = reactExports.useMemo(() => {
    const totalAmount = filteredTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const cashTransfers = filteredTransfers.filter((t) => t.transferMethod === "cash");
    const bankTransfers = filteredTransfers.filter((t) => t.transferMethod === "bank");
    const hawalehTransfers = filteredTransfers.filter((t) => t.transferMethod === "hawaleh");
    const cashAmount = cashTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const bankAmount = bankTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const hawalehAmount = hawalehTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const uniqueWorkers = new Set(filteredTransfers.map((t) => t.workerId)).size;
    const isFiltered = selectedProject && selectedProject !== "all" || selectedWorkerId && selectedWorkerId !== "all" || transferMethodFilter && transferMethodFilter !== "all" || searchTerm || dateFrom || dateTo || specificDate;
    return {
      totalTransfers: filteredTransfers.length,
      totalAmount: isFiltered ? totalAmount : summary?.totalWorkerTransfers || totalAmount,
      cashAmount,
      bankAmount,
      hawalehAmount,
      uniqueWorkers,
      averageTransfer: filteredTransfers.length > 0 ? totalAmount / filteredTransfers.length : 0
    };
  }, [filteredTransfers, summary, selectedProject, selectedWorkerId, transferMethodFilter, searchTerm, dateFrom, dateTo, specificDate]);
  const statsRowsConfig = reactExports.useMemo(() => [
    {
      columns: 3,
      gap: "sm",
      items: [
        {
          key: "totalTransfers",
          label: "إجمالي الحوالات",
          value: stats.totalTransfers.toString(),
          icon: Send,
          color: "blue"
        },
        {
          key: "totalAmount",
          label: "إجمالي المبالغ",
          value: formatCurrency(stats.totalAmount),
          icon: DollarSign,
          color: "green"
        },
        {
          key: "uniqueWorkers",
          label: "عدد العمال",
          value: stats.uniqueWorkers.toString(),
          icon: Users,
          color: "purple"
        },
        {
          key: "cashAmount",
          label: "نقداً",
          value: formatCurrency(stats.cashAmount),
          icon: Wallet,
          color: "emerald"
        },
        {
          key: "bankAmount",
          label: "تحويل بنكي",
          value: formatCurrency(stats.bankAmount),
          icon: CreditCard,
          color: "orange"
        },
        {
          key: "hawalehAmount",
          label: "حوالات",
          value: formatCurrency(stats.hawalehAmount),
          icon: TrendingUp,
          color: "teal"
        }
      ]
    }
  ], [stats, formatCurrency]);
  const filtersConfig = reactExports.useMemo(() => [
    {
      key: "worker",
      label: "العامل",
      type: "select",
      placeholder: "اختر العامل",
      options: [
        { value: "all", label: "جميع العمال" },
        ...workers.map((w) => ({
          value: w.id,
          label: `${w.name} (${w.type})`
        }))
      ]
    },
    {
      key: "transferMethod",
      label: "طريقة التحويل",
      type: "select",
      placeholder: "طريقة التحويل",
      options: [
        { value: "all", label: "جميع الطرق" },
        { value: "cash", label: "نقداً" },
        { value: "bank", label: "تحويل بنكي" },
        { value: "hawaleh", label: "حولة" }
      ]
    },
    {
      key: "dateFrom",
      label: "من تاريخ",
      type: "date",
      placeholder: "من تاريخ"
    },
    {
      key: "dateTo",
      label: "إلى تاريخ",
      type: "date",
      placeholder: "إلى تاريخ"
    },
    {
      key: "specificDate",
      label: "تاريخ يوم محدد",
      type: "date",
      placeholder: "تاريخ يوم محدد"
    }
  ], [workers]);
  const handleFilterChange = reactExports.useCallback((key, value) => {
    if (key === "worker") {
      setSelectedWorkerId(value);
    } else if (key === "transferMethod") {
      setTransferMethodFilter(value);
    } else if (key === "dateFrom") {
      setDateFrom(value);
    } else if (key === "dateTo") {
      setDateTo(value);
    } else if (key === "specificDate") {
      setSpecificDate(value);
    }
  }, []);
  const resetFilters = reactExports.useCallback(() => {
    setSelectedWorkerId("all");
    setTransferMethodFilter("all");
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setSpecificDate("");
  }, []);
  const handleRefresh = reactExports.useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ["/api/worker-transfers", selectedProjectId] });
    setIsRefreshing(false);
  }, [queryClient, selectedProjectId]);
  const exportToExcel = async () => {
    if (filteredTransfers.length === 0) return;
    const ExcelJS = (await __vitePreload(async () => {
      const { default: __vite_default__ } = await import("./index-BeuLVmQp.js").then((n) => n.e);
      return { default: __vite_default__ };
    }, true ? __vite__mapDeps([0,1]) : void 0)).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("حوالات العمال");
    worksheet.views = [{ rightToLeft: true }];
    worksheet.pageSetup = {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 },
      horizontalCentered: true,
      scale: 80
    };
    worksheet.columns = [
      { width: 5 },
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 12 },
      { width: 12 },
      { width: 15 },
      { width: 12 },
      { width: 20 }
    ];
    let currentRow = 1;
    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = "شركة الفتيني للمقاولات والاستشارات الهندسية";
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFF" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1f4e79" } };
    worksheet.getRow(currentRow).height = 25;
    currentRow++;
    worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
    const subtitleCell = worksheet.getCell(`A${currentRow}`);
    subtitleCell.value = "تقرير حوالات العمال";
    subtitleCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "1f4e79" } };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
    subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "f2f2f2" } };
    worksheet.getRow(currentRow).height = 16;
    currentRow += 2;
    const headers = ["#", "التاريخ", "العامل", "المشروع", "المبلغ", "طريقة التحويل", "المستلم", "رقم الهاتف", "ملاحظات"];
    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1f4e79" } };
    });
    headerRow.height = 22;
    currentRow++;
    filteredTransfers.forEach((transfer, index) => {
      const row = worksheet.getRow(currentRow);
      const worker = workers.find((w) => w.id === transfer.workerId);
      const project = projects.find((p) => p.id === transfer.projectId);
      const rowData = [
        index + 1,
        formatDate(transfer.transferDate),
        worker?.name || "غير معروف",
        project?.name || "غير معروف",
        transfer.amount,
        getTransferMethodLabel(transfer.transferMethod),
        transfer.recipientName,
        transfer.recipientPhone || "-",
        transfer.notes || "-"
      ];
      rowData.forEach((value, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = value;
        cell.font = { name: "Arial", size: 9 };
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
    worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
    const totalLabelCell = worksheet.getCell(`E${currentRow}`);
    totalLabelCell.value = "إجمالي المبالغ:";
    totalLabelCell.font = { name: "Arial", size: 11, bold: true };
    totalLabelCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.mergeCells(`G${currentRow}:I${currentRow}`);
    const totalValueCell = worksheet.getCell(`G${currentRow}`);
    totalValueCell.value = formatCurrency(stats.totalAmount);
    totalValueCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "006600" } };
    totalValueCell.alignment = { horizontal: "center", vertical: "middle" };
    const buffer = await workbook.xlsx.writeBuffer();
    const currentDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    await downloadExcelFile(buffer, `حوالات-العمال-${currentDate}.xlsx`);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", dir: "rtl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      UnifiedFilterDashboard,
      {
        statsRows: statsRowsConfig,
        searchValue: searchTerm,
        onSearchChange: setSearchTerm,
        searchPlaceholder: "ابحث عن عامل أو مستلم...",
        showSearch: true,
        filters: filtersConfig,
        filterValues: {
          worker: selectedWorkerId,
          transferMethod: transferMethodFilter
        },
        onFilterChange: handleFilterChange,
        onReset: resetFilters,
        onRefresh: handleRefresh,
        isRefreshing,
        actions: [
          {
            key: "export",
            icon: Download,
            label: "تصدير Excel",
            onClick: exportToExcel,
            variant: "outline",
            disabled: filteredTransfers.length === 0,
            tooltip: "تصدير إلى Excel"
          }
        ]
      }
    ),
    isLoadingTransfers ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "text-center py-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: "جاري تحميل الحوالات..." })
    ] }) }) : filteredTransfers.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-8 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-12 w-12 text-muted-foreground mx-auto mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-foreground mb-2", children: "لا توجد حوالات" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground mb-4", children: searchTerm || selectedWorkerId !== "all" || transferMethodFilter !== "all" ? "لا توجد نتائج مطابقة للفلاتر المحددة" : "لم يتم إرسال أي حوالات بعد" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          onClick: () => {
            setEditingTransfer(null);
            resetForm();
            setShowTransferDialog(true);
          },
          className: "bg-blue-600 hover:bg-blue-700",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4 ml-2" }),
            "إرسال حولة جديدة"
          ]
        }
      )
    ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(UnifiedCardGrid, { columns: 2, children: filteredTransfers.map((transfer) => {
      const worker = workers.find((w) => w.id === transfer.workerId);
      const project = projects.find((p) => p.id === transfer.projectId);
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        UnifiedCard,
        {
          title: worker?.name || "عامل غير معروف",
          subtitle: project?.name || "مشروع غير معروف",
          titleIcon: User,
          badges: [
            {
              label: worker?.type || "غير محدد",
              variant: "secondary"
            },
            {
              label: getTransferMethodLabel(transfer.transferMethod),
              variant: transfer.transferMethod === "cash" ? "success" : transfer.transferMethod === "bank" ? "warning" : "default"
            }
          ],
          fields: [
            {
              label: "المبلغ",
              value: formatCurrency(transfer.amount),
              icon: DollarSign,
              color: "success",
              emphasis: true
            },
            {
              label: "التاريخ",
              value: formatDate(transfer.transferDate),
              icon: Calendar,
              color: "muted"
            },
            {
              label: "المستلم",
              value: transfer.recipientName,
              icon: User,
              color: "info"
            },
            {
              label: "الهاتف",
              value: transfer.recipientPhone || "-",
              icon: Phone,
              color: "muted"
            }
          ],
          actions: [
            {
              icon: Pen,
              label: "تعديل",
              onClick: () => handleEdit(transfer),
              color: "blue"
            },
            {
              icon: Trash2,
              label: "حذف",
              onClick: () => deleteTransferMutation.mutate(transfer.id),
              color: "red"
            }
          ],
          footer: transfer.notes ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "ملاحظات:" }),
            " ",
            transfer.notes
          ] }) : void 0,
          compact: true
        },
        transfer.id
      );
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: showTransferDialog, onOpenChange: setShowTransferDialog, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editingTransfer ? "تعديل الحولة" : "حولة جديدة" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: editingTransfer ? "قم بتعديل بيانات الحولة المالية" : "إنشاء حولة مالية جديدة للعامل" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "العامل *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              WorkerSelect,
              {
                value: formData.workerId,
                onValueChange: (value) => setFormData({ ...formData, workerId: value }),
                workers,
                placeholder: "اختر العامل"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "المشروع *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ProjectSelect,
              {
                value: formData.projectId,
                onValueChange: (value) => setFormData({ ...formData, projectId: value }),
                projects,
                placeholder: "اختر المشروع"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "المبلغ (ر.ي) *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                type: "number",
                inputMode: "decimal",
                step: "0.01",
                value: formData.amount || "",
                onChange: (e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, amount: value ? parseFloat(value) : 0 });
                },
                placeholder: "0.00",
                min: "0",
                className: "text-center arabic-numbers"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "التاريخ *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              DatePickerField,
              {
                value: formData.transferDate,
                onChange: (date) => setFormData({ ...formData, transferDate: date ? format(date, "yyyy-MM-dd") : "" }),
                className: "w-full"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "المستلم *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              AutocompleteInput,
              {
                category: "recipientNames",
                value: formData.recipientName,
                onChange: (value) => setFormData({ ...formData, recipientName: value }),
                placeholder: "اسم المستلم"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "طريقة التحويل *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Select,
              {
                value: formData.transferMethod,
                onValueChange: (value) => setFormData({ ...formData, transferMethod: value }),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "اختر الطريقة" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "hawaleh", children: "حولة" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "cash", children: "نقداً" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "bank", children: "تحويل بنكي" })
                  ] })
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "رقم الهاتف" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              AutocompleteInput,
              {
                category: "recipientPhones",
                value: formData.recipientPhone,
                onChange: (value) => setFormData({ ...formData, recipientPhone: value }),
                placeholder: "رقم الهاتف"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "رقم التحويل" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              AutocompleteInput,
              {
                category: "workerTransferNumbers",
                value: formData.transferNumber,
                onChange: (value) => setFormData({ ...formData, transferNumber: value }),
                placeholder: "رقم التحويل"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "ملاحظات" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            AutocompleteInput,
            {
              category: "workerTransferNotes",
              value: formData.notes,
              onChange: (value) => setFormData({ ...formData, notes: value }),
              placeholder: "ملاحظات إضافية..."
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 pt-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              onClick: handleSubmit,
              disabled: createTransferMutation.isPending || updateTransferMutation.isPending,
              className: "flex-1 bg-blue-600 hover:bg-blue-700",
              children: [
                createTransferMutation.isPending || updateTransferMutation.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full ml-2" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-4 w-4 ml-2" }),
                editingTransfer ? "تحديث الحولة" : "إرسال الحولة"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              variant: "outline",
              onClick: () => {
                setShowTransferDialog(false);
                setEditingTransfer(null);
                resetForm();
              },
              children: "إلغاء"
            }
          )
        ] })
      ] })
    ] }) })
  ] });
}
export {
  WorkerAccountsPage as default
};
