import { r as reactExports, a as useToast, b as useQueryClient, g as useMutation, j as jsxRuntimeExports, L as Label, J as AutocompleteInput, X as CompactFieldGroup, B as Button, V as apiRequest, c as useFloatingButton, f as useQuery, Y as Building, T as TrendingUp, Z as CircleAlert, C as CreditCard, l as Card, m as CardContent, w as Dialog, x as DialogContent, y as DialogHeader, z as DialogTitle, A as DialogDescription, i as UnifiedFilterDashboard, P as Plus, n as UnifiedCardGrid, o as UnifiedCard, p as Pen, q as Trash2, v as Phone, s as Calendar, $ as MapPin } from "./index-BeuLVmQp.js";
import { S as Switch } from "./switch.js";
function AddSupplierForm({
  supplier,
  onSuccess,
  onCancel,
  submitLabel = "إضافة المورد"
}) {
  const [name, setName] = reactExports.useState(supplier?.name || "");
  const [contactPerson, setContactPerson] = reactExports.useState(supplier?.contactPerson || "");
  const [phone, setPhone] = reactExports.useState(supplier?.phone || "");
  const [address, setAddress] = reactExports.useState(supplier?.address || "");
  const [paymentTerms, setPaymentTerms] = reactExports.useState(supplier?.paymentTerms || "نقد");
  const [notes, setNotes] = reactExports.useState(supplier?.notes || "");
  const [isActive, setIsActive] = reactExports.useState(supplier?.isActive ?? true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const saveAutocompleteValue = async (category, value) => {
    if (!value || typeof value !== "string" || !value.trim()) return;
    try {
      await apiRequest("/api/autocomplete", "POST", {
        category,
        value: value.trim()
      });
    } catch (error) {
    }
  };
  const addSupplierMutation = useMutation({
    mutationFn: async (data) => {
      await Promise.all([
        saveAutocompleteValue("supplier_name", name),
        saveAutocompleteValue("supplier_contact_person", contactPerson),
        saveAutocompleteValue("supplier_phone", phone),
        saveAutocompleteValue("supplier_address", address),
        saveAutocompleteValue("supplier_payment_terms", paymentTerms)
      ]);
      if (supplier) {
        return apiRequest(`/api/suppliers/${supplier.id}`, "PUT", data);
      } else {
        return apiRequest("/api/suppliers", "POST", data);
      }
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      toast({
        title: "تم الحفظ",
        description: supplier ? "تم تعديل المورد بنجاح" : "تم إضافة المورد بنجاح"
      });
      if (!supplier) {
        resetForm();
      }
      onSuccess?.();
    },
    onError: async (error) => {
      await Promise.all([
        saveAutocompleteValue("supplier_name", name),
        saveAutocompleteValue("supplier_contact_person", contactPerson),
        saveAutocompleteValue("supplier_phone", phone),
        saveAutocompleteValue("supplier_address", address),
        saveAutocompleteValue("supplier_payment_terms", paymentTerms)
      ]);
      await queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      const errorMessage = error?.message || (supplier ? "حدث خطأ أثناء تعديل المورد" : "حدث خطأ أثناء إضافة المورد");
      toast({
        title: supplier ? "فشل في تعديل المورد" : "فشل في إضافة المورد",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });
  const resetForm = () => {
    setName("");
    setContactPerson("");
    setPhone("");
    setAddress("");
    setPaymentTerms("نقد");
    setNotes("");
    setIsActive(true);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || typeof name !== "string" || !name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى ملء اسم المورد",
        variant: "destructive"
      });
      return;
    }
    const supplierData = {
      name: name && typeof name === "string" ? name.trim() : "",
      contactPerson: contactPerson && typeof contactPerson === "string" ? contactPerson.trim() || null : null,
      phone: phone && typeof phone === "string" ? phone.trim() || null : null,
      address: address && typeof address === "string" ? address.trim() || null : null,
      paymentTerms: paymentTerms && typeof paymentTerms === "string" ? paymentTerms.trim() || "نقد" : "نقد",
      notes: notes && typeof notes === "string" ? notes.trim() || null : null,
      isActive,
      totalDebt: "0"
    };
    addSupplierMutation.mutate(supplierData);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "supplier-name", className: "text-sm font-medium text-foreground", children: "اسم المورد *" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        AutocompleteInput,
        {
          value: name,
          onChange: setName,
          placeholder: "اسم المورد أو الشركة",
          category: "supplier_name",
          className: "w-full"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CompactFieldGroup, { columns: 2, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "contact-person", className: "text-sm font-medium text-foreground", children: "الشخص المسؤول" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AutocompleteInput,
          {
            value: contactPerson,
            onChange: setContactPerson,
            placeholder: "اسم الشخص المسؤول",
            category: "supplier_contact_person",
            className: "w-full"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "phone", className: "text-sm font-medium text-foreground", children: "رقم الهاتف" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AutocompleteInput,
          {
            value: phone,
            onChange: setPhone,
            placeholder: "777123456",
            category: "supplier_phone",
            type: "tel",
            inputMode: "numeric",
            className: "w-full"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CompactFieldGroup, { columns: 2, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "address", className: "text-sm font-medium text-foreground", children: "العنوان" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AutocompleteInput,
          {
            value: address,
            onChange: setAddress,
            placeholder: "العنوان الكامل",
            category: "supplier_address",
            className: "w-full"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "payment-terms", className: "text-sm font-medium text-foreground", children: "شروط الدفع" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AutocompleteInput,
          {
            value: paymentTerms,
            onChange: setPaymentTerms,
            placeholder: "نقد / 30 يوم / 60 يوم",
            category: "supplier_payment_terms",
            className: "w-full"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "notes", className: "text-sm font-medium text-foreground", children: "ملاحظات" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        AutocompleteInput,
        {
          value: notes,
          onChange: setNotes,
          placeholder: "ملاحظات إضافية...",
          category: "notes",
          className: "w-full"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg bg-muted/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm font-medium", children: "حالة المورد" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: isActive ? "نشط ومتاح للتعامل" : "غير نشط" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Switch,
        {
          checked: isActive,
          onCheckedChange: setIsActive
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-3 pt-2 border-t", children: [
      onCancel && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          variant: "outline",
          onClick: onCancel,
          disabled: addSupplierMutation.isPending,
          children: "إلغاء"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "submit",
          disabled: addSupplierMutation.isPending,
          className: "min-w-[100px]",
          children: addSupplierMutation.isPending ? "جاري الحفظ..." : submitLabel
        }
      )
    ] })
  ] });
}
function SuppliersPage() {
  const [isDialogOpen, setIsDialogOpen] = reactExports.useState(false);
  const [selectedSupplier, setSelectedSupplier] = reactExports.useState(null);
  const [searchValue, setSearchValue] = reactExports.useState("");
  const [filterValues, setFilterValues] = reactExports.useState({
    status: "all"
  });
  const [isRefreshing, setIsRefreshing] = reactExports.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const handleFilterChange = reactExports.useCallback((key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleResetFilters = reactExports.useCallback(() => {
    setSearchValue("");
    setFilterValues({ status: "all" });
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر"
    });
  }, [toast]);
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + " ر.ي";
  };
  const { data: suppliers = [], isLoading, refetch: refetchSuppliers } = useQuery({
    queryKey: ["/api/suppliers"]
  });
  const handleRefresh = reactExports.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchSuppliers();
      toast({
        title: "تم التحديث",
        description: "تم تحديث البيانات بنجاح"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث البيانات",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchSuppliers, toast]);
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiRequest(`/api/suppliers/${id}`, "DELETE");
      return response;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "تم حذف المورد بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في حذف المورد", variant: "destructive" });
    }
  });
  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };
  const handleDelete = (supplier) => {
    if (confirm(`هل أنت متأكد من حذف المورد "${supplier.name}"؟`)) {
      deleteMutation.mutate(supplier.id);
    }
  };
  const resetForm = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(false);
  };
  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(true);
  };
  reactExports.useEffect(() => {
    setFloatingAction(handleAddSupplier, "إضافة مورد جديد");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);
  const filteredSuppliers = reactExports.useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch = supplier.name.toLowerCase().includes(searchValue.toLowerCase()) || supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchValue.toLowerCase()) || supplier.phone && supplier.phone.includes(searchValue);
      const matchesStatus = filterValues.status === "all" || filterValues.status === "active" && supplier.isActive || filterValues.status === "inactive" && !supplier.isActive;
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchValue, filterValues]);
  const stats = reactExports.useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter((s) => s.isActive).length,
    inactive: suppliers.filter((s) => !s.isActive).length,
    totalDebt: suppliers.reduce((sum, s) => sum + (parseFloat(s.totalDebt?.toString() || "0") || 0), 0)
  }), [suppliers]);
  const statsRowsConfig = reactExports.useMemo(() => [
    {
      columns: 2,
      gap: "sm",
      items: [
        {
          key: "total",
          label: "إجمالي الموردين",
          value: stats.total,
          icon: Building,
          color: "blue"
        },
        {
          key: "active",
          label: "الموردين النشطين",
          value: stats.active,
          icon: TrendingUp,
          color: "green",
          showDot: true,
          dotColor: "bg-green-500"
        }
      ]
    },
    {
      columns: 2,
      gap: "sm",
      items: [
        {
          key: "inactive",
          label: "غير النشطين",
          value: stats.inactive,
          icon: CircleAlert,
          color: "orange"
        },
        {
          key: "totalDebt",
          label: "إجمالي المديونية",
          value: formatCurrency(stats.totalDebt),
          icon: CreditCard,
          color: stats.totalDebt > 0 ? "red" : "green"
        }
      ]
    }
  ], [stats]);
  const filtersConfig = reactExports.useMemo(() => [
    {
      key: "status",
      label: "الحالة",
      type: "select",
      defaultValue: "all",
      options: [
        { value: "all", label: "جميع الحالات" },
        { value: "active", label: "نشط" },
        { value: "inactive", label: "غير نشط" }
      ]
    }
  ], []);
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto p-4 space-y-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-pulse space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-8 bg-muted rounded w-48" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 bg-muted rounded w-64" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4", children: [...Array(4)].map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "animate-pulse", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 bg-muted rounded w-16" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-6 bg-muted rounded w-12" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-8 w-8 bg-muted rounded" })
      ] }) }) }, i)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4", children: [...Array(8)].map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "animate-pulse", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-5 bg-muted rounded w-24" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-3 bg-muted rounded w-20" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-3 bg-muted rounded w-28" })
      ] }) }) }, i)) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto p-4 space-y-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: isDialogOpen, onOpenChange: setIsDialogOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-lg sm:text-xl", children: selectedSupplier ? "تعديل بيانات المورد" : "إضافة مورد جديد" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: selectedSupplier ? "قم بتعديل بيانات المورد المحدد" : "أدخل بيانات المورد الجديد" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        AddSupplierForm,
        {
          supplier: selectedSupplier,
          onSuccess: () => {
            resetForm();
            queryClient.refetchQueries({ queryKey: ["/api/suppliers"] });
          },
          onCancel: resetForm,
          submitLabel: selectedSupplier ? "تحديث المورد" : "إضافة المورد"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      UnifiedFilterDashboard,
      {
        statsRows: statsRowsConfig,
        searchValue,
        onSearchChange: setSearchValue,
        searchPlaceholder: "البحث في الموردين (الاسم، الشخص المسؤول، رقم الهاتف)...",
        filters: filtersConfig,
        filterValues,
        onFilterChange: handleFilterChange,
        onReset: handleResetFilters,
        onRefresh: handleRefresh,
        isRefreshing,
        resultsSummary: searchValue || filterValues.status !== "all" ? {
          totalCount: suppliers.length,
          filteredCount: filteredSuppliers.length,
          totalLabel: "النتائج",
          filteredLabel: "من",
          totalValue: filteredSuppliers.reduce((sum, s) => sum + (parseFloat(s.totalDebt?.toString() || "0") || 0), 0),
          totalValueLabel: "إجمالي المديونية",
          unit: "ر.ي"
        } : void 0
      }
    ),
    filteredSuppliers.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "py-12 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Building, { className: "h-16 w-16 mx-auto text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium mt-4", children: searchValue ? "لا توجد نتائج" : "لا توجد موردين" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground max-w-md mx-auto mt-2", children: searchValue ? "لم يتم العثور على موردين يطابقون كلمات البحث المدخلة. جرب كلمات أخرى." : "ابدأ ببناء قاعدة بيانات الموردين الخاصة بك عن طريق إضافة أول مورد." }),
      !searchValue && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => {
        resetForm();
        setIsDialogOpen(true);
      }, className: "gap-2 mt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
        "إضافة مورد جديد"
      ] })
    ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(UnifiedCardGrid, { columns: 4, children: filteredSuppliers.map((supplier) => {
      const debt = parseFloat(supplier.totalDebt?.toString() || "0") || 0;
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        UnifiedCard,
        {
          title: supplier.name,
          subtitle: supplier.contactPerson || void 0,
          titleIcon: Building,
          headerColor: supplier.isActive ? "#22c55e" : "#6b7280",
          badges: [
            {
              label: supplier.isActive ? "نشط" : "معطل",
              variant: supplier.isActive ? "success" : "secondary"
            },
            ...debt > 0 ? [{
              label: "مديون",
              variant: "destructive"
            }] : [{
              label: "رصيد سليم",
              variant: "success"
            }]
          ],
          fields: [
            {
              label: "المديونية",
              value: debt > 0 ? formatCurrency(debt) : "لا يوجد",
              icon: CreditCard,
              emphasis: debt > 0,
              color: debt > 0 ? "danger" : "success"
            },
            {
              label: "رقم الهاتف",
              value: supplier.phone || "غير محدد",
              icon: Phone
            },
            {
              label: "شروط الدفع",
              value: supplier.paymentTerms || "غير محدد",
              icon: CreditCard
            },
            {
              label: "تاريخ الإضافة",
              value: supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString("en-GB") : "غير محدد",
              icon: Calendar
            },
            ...supplier.address ? [{
              label: "العنوان",
              value: supplier.address,
              icon: MapPin
            }] : []
          ],
          actions: [
            {
              icon: Pen,
              label: "تعديل",
              onClick: () => handleEdit(supplier)
            },
            {
              icon: Trash2,
              label: "حذف",
              variant: "ghost",
              onClick: () => handleDelete(supplier)
            }
          ],
          footer: supplier.notes ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "line-clamp-2 text-amber-800 dark:text-amber-200", children: supplier.notes }) }) : void 0,
          compact: true
        },
        supplier.id
      );
    }) })
  ] });
}
export {
  SuppliersPage as default
};
