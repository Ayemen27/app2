const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-BeuLVmQp.js","assets/index.css"])))=>i.map(i=>d[i]);
import { am as createLucideIcon, a as useToast, b as useQueryClient, r as reactExports, an as useForm, g as useMutation, V as apiRequest, j as jsxRuntimeExports, w as Dialog, x as DialogContent, y as DialogHeader, z as DialogTitle, A as DialogDescription, ao as Form, X as CompactFieldGroup, ap as FormField, aq as FormItem, ar as FormLabel, as as FormControl, I as Input, at as FormMessage, au as Combobox, K as Select, M as SelectTrigger, N as SelectValue, O as SelectContent, Q as SelectItem, av as SearchableSelect, B as Button, aw as Camera, ax as X, ay as Textarea, az as t, aA as objectType, aB as stringType, f as useQuery, aC as History, l as Card, m as CardContent, a4 as FileText, $ as MapPin, ai as Badge, s as Calendar, aD as ArrowRight, t as User, c as useFloatingButton, aE as Wrench, aF as CircleCheck, ag as Settings, aG as Truck, a9 as ChartColumn, i as UnifiedFilterDashboard, k as Download, P as Plus, n as UnifiedCardGrid, o as UnifiedCard, aH as SquarePen, q as Trash2, D as DollarSign, aI as formatCurrency, aJ as formatDate, _ as __vitePreload, aK as COMPANY_INFO, aL as addReportHeader, aM as EXCEL_STYLES, R as downloadExcelFile } from "./index-BeuLVmQp.js";
import { U as Upload } from "./upload.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ArrowUpDown = createLucideIcon("ArrowUpDown", [
  ["path", { d: "m21 16-4 4-4-4", key: "f6ql7i" }],
  ["path", { d: "M17 20V4", key: "1ejh1v" }],
  ["path", { d: "m3 8 4-4 4 4", key: "11wl7u" }],
  ["path", { d: "M7 4v16", key: "1glfcx" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Image = createLucideIcon("Image", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Printer = createLucideIcon("Printer", [
  [
    "path",
    {
      d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",
      key: "143wyd"
    }
  ],
  ["path", { d: "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6", key: "1itne7" }],
  ["rect", { x: "6", y: "14", width: "12", height: "8", rx: "1", key: "1ue0tg" }]
]);
const DEFAULT_UNITS = ["قطعة", "مجموعة", "صندوق", "متر", "كيلو", "لتر", "طن", "عدد", "علبة", "كرتون"];
const equipmentSchema = objectType({
  name: stringType().min(1, "اسم المعدة مطلوب"),
  sku: stringType().optional(),
  categoryId: stringType().optional(),
  unit: stringType().min(1, "الوحدة مطلوبة"),
  status: stringType().min(1, "حالة المعدة مطلوبة"),
  condition: stringType().min(1, "حالة الجودة مطلوبة"),
  description: stringType().optional(),
  purchaseDate: stringType().optional(),
  purchasePrice: stringType().optional(),
  projectId: stringType().nullable().optional(),
  imageUrl: stringType().optional()
});
function AddEquipmentDialog({ open, onOpenChange, projects, equipment }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = reactExports.useRef(null);
  const [selectedImage, setSelectedImage] = reactExports.useState(null);
  const [imageFile, setImageFile] = reactExports.useState(null);
  const isEditing = !!equipment;
  const form = useForm({
    resolver: t(equipmentSchema),
    defaultValues: {
      name: equipment?.name || "",
      sku: equipment?.sku || "",
      categoryId: equipment?.categoryId || "",
      unit: equipment?.unit || "قطعة",
      status: equipment?.status || "available",
      condition: equipment?.condition || "excellent",
      description: equipment?.description || "",
      purchaseDate: equipment?.purchaseDate || "",
      purchasePrice: equipment?.purchasePrice?.toString() || "",
      projectId: equipment?.projectId || null,
      imageUrl: equipment?.imageUrl || ""
    }
  });
  const handleImageSelect = (file) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        setSelectedImage(result);
        setImageFile(file);
        form.setValue("imageUrl", result);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة صالح",
        variant: "destructive"
      });
    }
  };
  const handleImageCapture = (useCamera) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      if (useCamera) {
        fileInputRef.current.setAttribute("capture", "environment");
      } else {
        fileInputRef.current.removeAttribute("capture");
      }
      fileInputRef.current.click();
    }
  };
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    form.setValue("imageUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (isEditing && equipment?.id) {
        return apiRequest(`/api/equipment/${equipment.id}`, "PUT", data);
      } else {
        return apiRequest("/api/equipment", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "equipment"
      });
      queryClient.refetchQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "equipment"
      });
      toast({
        title: "نجح الحفظ",
        description: isEditing ? "تم تحديث المعدة بنجاح" : "تم إضافة المعدة بنجاح",
        variant: "default"
      });
      form.reset();
      handleRemoveImage();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: error.message || (isEditing ? "حدث خطأ أثناء تحديث المعدة" : "حدث خطأ أثناء إضافة المعدة"),
        variant: "destructive"
      });
    }
  });
  reactExports.useEffect(() => {
    if (equipment && isEditing) {
      form.reset({
        name: equipment.name || "",
        sku: equipment.sku || "",
        categoryId: equipment.categoryId || "",
        unit: equipment.unit || "قطعة",
        status: equipment.status || "available",
        condition: equipment.condition || "excellent",
        description: equipment.description || "",
        purchaseDate: equipment.purchaseDate || "",
        purchasePrice: equipment.purchasePrice?.toString() || "",
        projectId: equipment.projectId || null,
        imageUrl: equipment.imageUrl || ""
      });
      if (equipment.imageUrl) {
        setSelectedImage(equipment.imageUrl);
      }
    }
  }, [equipment, isEditing, form]);
  const onSubmit = (data) => {
    const submitData = {
      ...data,
      purchasePrice: data.purchasePrice ? data.purchasePrice : void 0,
      projectId: data.projectId || null,
      categoryId: data.categoryId || void 0
    };
    saveMutation.mutate(submitData);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto", dir: "rtl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "pb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-lg", children: isEditing ? "تعديل المعدة" : "إضافة معدة جديدة" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "text-sm text-gray-600", children: isEditing ? "قم بتحديث بيانات المعدة" : "أدخل تفاصيل المعدة الجديدة" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Form, { ...form, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: form.handleSubmit(onSubmit), className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CompactFieldGroup, { columns: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "name",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm font-medium", children: "اسم المعدة *" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  placeholder: "مثال: حفار صغير",
                  className: "h-9 text-sm",
                  ...field,
                  "data-testid": "input-equipment-name"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "sku",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm font-medium", children: "الكود" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  placeholder: "مثال: EQ-001",
                  className: "h-9 text-sm",
                  ...field,
                  "data-testid": "input-equipment-sku"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CompactFieldGroup, { columns: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "unit",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm font-medium", children: "الوحدة *" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Combobox,
                {
                  value: field.value,
                  onValueChange: field.onChange,
                  options: DEFAULT_UNITS,
                  placeholder: "اختر الوحدة",
                  allowCustom: true,
                  customPlaceholder: "إضافة وحدة جديدة..."
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "status",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm font-medium", children: "الحالة *" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { onValueChange: field.onChange, defaultValue: field.value, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { "data-testid": "select-equipment-status", className: "h-9 text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "اختر الحالة" }) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "available", children: "متاح" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "assigned", children: "مخصص" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "maintenance", children: "صيانة" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "lost", children: "مفقود" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "consumed", children: "مستهلك" })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CompactFieldGroup, { columns: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "condition",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm font-medium", children: "حالة الجودة *" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { onValueChange: field.onChange, defaultValue: field.value, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { "data-testid": "select-equipment-condition", className: "h-9 text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "اختر الجودة" }) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "excellent", children: "ممتاز" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "good", children: "جيد" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "fair", children: "مقبول" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "poor", children: "ضعيف" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "damaged", children: "تالف" })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "projectId",
            render: ({ field }) => {
              const projectOptions = [
                { value: "warehouse", label: "المستودع" },
                ...Array.isArray(projects) ? projects.map((project) => ({
                  value: project.id,
                  label: project.name
                })) : []
              ];
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm font-medium", children: "المشروع" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SearchableSelect,
                  {
                    value: field.value || "warehouse",
                    onValueChange: (value) => field.onChange(value === "warehouse" ? null : value),
                    options: projectOptions,
                    placeholder: "المستودع",
                    searchPlaceholder: "ابحث عن مشروع...",
                    emptyText: "لا توجد مشاريع",
                    triggerClassName: "h-9 text-sm"
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
              ] });
            }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CompactFieldGroup, { columns: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "purchaseDate",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm font-medium", children: "تاريخ الشراء" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  type: "date",
                  className: "h-9 text-sm",
                  ...field,
                  "data-testid": "input-purchase-date"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "purchasePrice",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm font-medium", children: "سعر الشراء" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  type: "number",
                  placeholder: "0",
                  className: "h-9 text-sm",
                  ...field,
                  "data-testid": "input-purchase-price"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        FormField,
        {
          control: form.control,
          name: "imageUrl",
          render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm font-medium", children: "صورة المعدة" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  ref: fileInputRef,
                  type: "file",
                  accept: "image/*",
                  className: "hidden",
                  onChange: (e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageSelect(file);
                  },
                  "data-testid": "input-file-image"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(CompactFieldGroup, { columns: 2, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    type: "button",
                    variant: "outline",
                    size: "sm",
                    onClick: () => handleImageCapture(true),
                    className: "h-9 text-xs w-full",
                    "data-testid": "button-camera",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "h-4 w-4 ml-1" }),
                      "تصوير بالكاميرا"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    type: "button",
                    variant: "outline",
                    size: "sm",
                    onClick: () => handleImageCapture(false),
                    className: "h-9 text-xs w-full",
                    "data-testid": "button-gallery",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-4 w-4 ml-1" }),
                      "اختيار من المعرض"
                    ]
                  }
                )
              ] }),
              selectedImage && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full h-28 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: selectedImage,
                    alt: "معاينة الصورة",
                    className: "w-full h-full object-cover"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: handleRemoveImage,
                    className: "absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors",
                    "data-testid": "button-remove-image",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3 w-3" })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "h-3 w-3 inline ml-1" }),
                  imageFile?.name || "صورة محددة"
                ] })
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
          ] })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        FormField,
        {
          control: form.control,
          name: "description",
          render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm font-medium", children: "الوصف" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Textarea,
              {
                placeholder: "وصف إضافي للمعدة...",
                className: "resize-none text-sm min-h-[50px]",
                rows: 2,
                ...field,
                "data-testid": "textarea-description"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
          ] })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row gap-2 sm:justify-end pt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "outline",
            onClick: () => onOpenChange(false),
            className: "order-2 sm:order-1 h-9 text-sm",
            "data-testid": "button-cancel",
            children: "إلغاء"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "submit",
            disabled: saveMutation.isPending,
            className: "order-1 sm:order-2 h-9 text-sm",
            "data-testid": "button-submit",
            children: saveMutation.isPending ? "جاري الحفظ..." : isEditing ? "تحديث المعدة" : "إضافة المعدة"
          }
        )
      ] })
    ] }) })
  ] }) });
}
const transferSchema = objectType({
  toProjectId: stringType().nullable(),
  reason: stringType().min(1, "سبب النقل مطلوب"),
  performedBy: stringType().min(1, "اسم من قام بالنقل مطلوب"),
  notes: stringType().optional()
});
function TransferEquipmentDialog({ equipment, open, onOpenChange, projects }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: t(transferSchema),
    defaultValues: {
      toProjectId: null,
      reason: "",
      performedBy: "",
      notes: ""
    }
  });
  const transferMutation = useMutation({
    mutationFn: (data) => apiRequest(`/api/equipment/${equipment?.id}/transfer`, "POST", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["equipment"] });
      await queryClient.invalidateQueries({ queryKey: ["equipment-movements"] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
      toast({
        title: "نجح النقل",
        description: "تم نقل المعدة بنجاح",
        variant: "default"
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في نقل المعدة",
        variant: "destructive"
      });
    }
  });
  const onSubmit = (data) => {
    transferMutation.mutate({
      ...data,
      toProjectId: data.toProjectId || null
    });
  };
  const getCurrentLocationName = () => {
    if (!equipment) return "";
    if (!equipment.currentProjectId) return "المستودع";
    const project = Array.isArray(projects) ? projects.find((p) => p.id === equipment.currentProjectId) : void 0;
    return project ? project.name : "مشروع غير معروف";
  };
  if (!equipment) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-[450px]", dir: "rtl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "pb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2 text-lg", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpDown, { className: "h-5 w-5" }),
        "نقل المعدة"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { className: "text-sm", children: [
        'نقل المعدة "',
        equipment.name,
        '" إلى موقع جديد'
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Form, { ...form, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: form.handleSubmit(onSubmit), className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-gray-50 dark:bg-gray-800 p-3 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-600 dark:text-gray-400", children: "الموقع الحالي:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", "data-testid": "text-current-location", children: getCurrentLocationName() })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpDown, { className: "h-4 w-4 text-gray-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-600 dark:text-gray-400", children: "الموقع الجديد:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium text-blue-600", "data-testid": "text-new-location", children: form.watch("toProjectId") && form.watch("toProjectId") !== "warehouse" ? projects.find((p) => p.id === form.watch("toProjectId"))?.name || "المستودع" : "المستودع" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        FormField,
        {
          control: form.control,
          name: "toProjectId",
          render: ({ field }) => {
            const projectOptions = [
              { value: "warehouse", label: "المستودع" },
              ...projects.filter((p) => p.id !== equipment?.currentProjectId).map((project) => ({
                value: project.id,
                label: project.name
              }))
            ];
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm", children: "المشروع المقصود" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                SearchableSelect,
                {
                  value: field.value || "warehouse",
                  onValueChange: (value) => field.onChange(value === "warehouse" ? null : value),
                  options: projectOptions,
                  placeholder: "اختر المشروع المقصود",
                  searchPlaceholder: "ابحث عن مشروع...",
                  emptyText: "لا توجد مشاريع",
                  triggerClassName: "h-9"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] });
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CompactFieldGroup, { columns: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "reason",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm", children: "سبب النقل *" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  placeholder: "سبب النقل",
                  className: "h-9 text-sm",
                  ...field,
                  "data-testid": "input-transfer-reason"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "performedBy",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm", children: "تم بواسطة *" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  placeholder: "اسم المسؤول",
                  className: "h-9 text-sm",
                  ...field,
                  "data-testid": "input-performed-by"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        FormField,
        {
          control: form.control,
          name: "notes",
          render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { className: "text-sm", children: "ملاحظات إضافية" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Textarea,
              {
                placeholder: "ملاحظات أو تفاصيل إضافية...",
                className: "resize-none text-sm min-h-[50px]",
                rows: 2,
                ...field,
                "data-testid": "textarea-transfer-notes"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
          ] })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end space-x-2 space-x-reverse pt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "outline",
            onClick: () => onOpenChange(false),
            className: "h-9 text-sm",
            "data-testid": "button-cancel-transfer",
            children: "إلغاء"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "submit",
            disabled: transferMutation.isPending,
            className: "h-9 text-sm",
            "data-testid": "button-confirm-transfer",
            children: transferMutation.isPending ? "جاري النقل..." : "تأكيد النقل"
          }
        )
      ] })
    ] }) })
  ] }) });
}
function EquipmentMovementHistoryDialog({
  equipment,
  open,
  onOpenChange,
  projects
}) {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["equipment-movements", equipment?.id],
    queryFn: () => fetch(`/api/equipment/${equipment?.id}/movements`).then((res) => res.json()),
    enabled: !!equipment?.id && open,
    staleTime: 3e4
    // 30 seconds
  });
  const getProjectName = (projectId) => {
    if (!projectId) return "غير محدد";
    const project = Array.isArray(projects) ? projects.find((p) => p.id === projectId) : void 0;
    return project ? project.name : "مشروع غير معروف";
  };
  const formatMovementDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short"
      }) + " - " + date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "w-[95vw] max-w-[900px] h-[90vh] overflow-hidden flex flex-col", dir: "rtl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 -m-6 p-6 rounded-t-lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-3 text-xl font-bold", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 bg-blue-100 rounded-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "w-6 h-6 text-blue-700" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-blue-900", children: "سجل حركة المعدة" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { className: "text-sm font-normal text-blue-600 mt-1", children: [
        equipment?.name,
        " - عرض سجل التحويلات والحركات"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto space-y-4 mt-4 px-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "border-0 shadow-lg bg-gradient-to-br from-white to-gray-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-3 bg-blue-50 rounded-lg", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-5 h-5 text-blue-600" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-600", children: "كود المعدة" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-gray-900", children: equipment?.code })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-3 bg-green-50 rounded-lg", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 bg-green-100 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "w-5 h-5 text-green-600" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-600", children: "المشروع الحالي" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-gray-900 truncate", children: getProjectName(equipment?.currentProjectId || null) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-3 bg-purple-50 rounded-lg", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-5 h-5 text-purple-600" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-600", children: "نوع المعدة" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-gray-900", children: equipment?.type })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-3 bg-orange-50 rounded-lg", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-3 h-3 rounded-full ${equipment?.status === "active" ? "bg-green-500" : equipment?.status === "maintenance" ? "bg-yellow-500" : equipment?.status === "damaged" ? "bg-red-500" : "bg-gray-400"}` }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-600", children: "حالة المعدة" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: `font-bold ${equipment?.status === "active" ? "bg-green-100 text-green-800" : equipment?.status === "maintenance" ? "bg-yellow-100 text-yellow-800" : equipment?.status === "damaged" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`, children: equipment?.status === "active" ? "نشط" : equipment?.status === "maintenance" ? "في الصيانة" : equipment?.status === "damaged" ? "معطل" : "غير نشط" })
            ] })
          ] })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-blue-100", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 bg-indigo-100 rounded-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "w-5 h-5 text-indigo-700" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-gray-900", children: "سجل الحركات" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { className: "bg-indigo-100 text-indigo-800 font-bold px-3 py-1", children: [
            movements.length,
            " حركة"
          ] }) })
        ] }),
        isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center py-12", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-4 border-blue-200" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-0" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-gray-700", children: "جاري تحميل سجل الحركات..." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-500 mt-1", children: "الرجاء الانتظار" })
          ] })
        ] }) : movements.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "border-0 shadow-lg bg-gradient-to-br from-gray-50 to-slate-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "py-12 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-sm mx-auto", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "w-10 h-10 text-gray-400" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-bold text-gray-700", children: "لا توجد حركات مسجلة" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-500 text-sm", children: "لم يتم تسجيل أي حركات نقل لهذه المعدة حتى الآن." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 p-3 bg-blue-50 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-blue-600", children: "💡 ستظهر جميع حركات النقل هنا عند تسجيلها" }) })
        ] }) }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: movements.map((movement, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-bold text-blue-700", children: [
              "#",
              movements.length - index
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-bold text-gray-900", children: [
                "حركة رقم ",
                movements.length - index
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 text-xs text-gray-500 mt-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-3 h-3" }),
                formatMovementDate(movement.movementDate)
              ] })
            ] })
          ] }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4 rounded-xl border border-blue-100", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row items-center gap-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 w-full", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-6 h-6 bg-green-100 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "w-3 h-3 text-green-600" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-gray-600", children: "من" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-white/70 p-3 rounded-lg border border-green-200", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-bold text-gray-900 block truncate", children: getProjectName(movement.fromProjectId) }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 bg-blue-100 rounded-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "w-4 h-4 text-blue-600" }) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 w-full", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "w-3 h-3 text-blue-600" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-gray-600", children: "إلى" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-white/70 p-3 rounded-lg border border-blue-200", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-bold text-gray-900 block truncate", children: getProjectName(movement.toProjectId) }) })
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-3 bg-purple-50 rounded-lg", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "w-4 h-4 text-purple-600" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-600", children: "قام بالنقل" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-bold text-gray-900", children: movement.performedBy })
                ] })
              ] }),
              movement.reason && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 p-3 bg-amber-50 rounded-lg", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mt-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-4 h-4 text-amber-600" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-gray-600", children: "السبب" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-gray-900 break-words", children: movement.reason })
                ] })
              ] }),
              movement.notes && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-3 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center mt-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: "💡" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-800 font-bold text-xs block", children: "ملاحظات مهمة" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-700 text-sm break-words", children: movement.notes })
                ] })
              ] }) })
            ] })
          ] })
        ] }) }, movement.id)) })
      ] })
    ] })
  ] }) });
}
function EquipmentManagement() {
  const [searchValue, setSearchValue] = reactExports.useState("");
  const [filterValues, setFilterValues] = reactExports.useState({
    status: "all",
    type: "all",
    project: "all"
  });
  const [isRefreshing, setIsRefreshing] = reactExports.useState(false);
  const [showAddDialog, setShowAddDialog] = reactExports.useState(false);
  const [selectedEquipment, setSelectedEquipment] = reactExports.useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = reactExports.useState(false);
  const [showTransferDialog, setShowTransferDialog] = reactExports.useState(false);
  const [showMovementHistoryDialog, setShowMovementHistoryDialog] = reactExports.useState(false);
  const [enlargedImage, setEnlargedImage] = reactExports.useState(null);
  const [showEquipmentModal, setShowEquipmentModal] = reactExports.useState(false);
  const [isExporting, setIsExporting] = reactExports.useState(false);
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const { toast } = useToast();
  const handleFilterChange = reactExports.useCallback((key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleResetFilters = reactExports.useCallback(() => {
    setSearchValue("");
    setFilterValues({ status: "all", type: "all", project: "all" });
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر"
    });
  }, [toast]);
  reactExports.useEffect(() => {
    const handleAddEquipment = () => setShowAddDialog(true);
    setFloatingAction(handleAddEquipment, "إضافة معدة جديدة");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);
  const { data: equipment = [], isLoading, refetch: refetchEquipment } = useQuery({
    queryKey: ["equipment", searchValue, filterValues.status, filterValues.type, filterValues.project],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchValue) params.append("searchTerm", searchValue);
      if (filterValues.status !== "all") params.append("status", filterValues.status);
      if (filterValues.type !== "all") params.append("type", filterValues.type);
      if (filterValues.project !== "all" && filterValues.project !== "warehouse") {
        params.append("projectId", filterValues.project);
      } else if (filterValues.project === "warehouse") {
        params.append("projectId", "");
      }
      try {
        const result = await apiRequest(`/api/equipment?${params}`);
        return result.data || result || [];
      } catch (error) {
        throw new Error("فشل في جلب المعدات");
      }
    },
    staleTime: 30 * 60 * 1e3,
    gcTime: 2 * 60 * 60 * 1e3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 0,
    enabled: true
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await apiRequest("/api/projects", "GET");
      return response;
    },
    staleTime: 15 * 60 * 1e3,
    gcTime: 60 * 60 * 1e3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 1e3
  });
  const handleRefresh = reactExports.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchEquipment();
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
  }, [refetchEquipment, toast]);
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await apiRequest(`/api/equipment/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.refetchQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "equipment"
      });
      toast({
        title: "تم حذف المعدة بنجاح",
        description: "تم حذف المعدة من النظام نهائياً"
      });
      setShowEquipmentModal(false);
    },
    onError: (error) => {
      toast({
        title: "خطأ في حذف المعدة",
        description: error.message || "حدث خطأ أثناء حذف المعدة",
        variant: "destructive"
      });
    }
  });
  const stats = reactExports.useMemo(() => ({
    total: Array.isArray(equipment) ? equipment.length : 0,
    active: Array.isArray(equipment) ? equipment.filter((e) => e.status === "active" || e.status === "available").length : 0,
    assigned: Array.isArray(equipment) ? equipment.filter((e) => e.status === "assigned").length : 0,
    maintenance: Array.isArray(equipment) ? equipment.filter((e) => e.status === "maintenance").length : 0,
    outOfService: Array.isArray(equipment) ? equipment.filter((e) => e.status === "out_of_service" || e.status === "lost").length : 0,
    inWarehouse: Array.isArray(equipment) ? equipment.filter((e) => !e.currentProjectId).length : 0
  }), [equipment]);
  const statsRowsConfig = reactExports.useMemo(() => [
    {
      columns: 3,
      gap: "sm",
      items: [
        {
          key: "total",
          label: "إجمالي المعدات",
          value: stats.total,
          icon: Wrench,
          color: "blue"
        },
        {
          key: "active",
          label: "متاحة",
          value: stats.active,
          icon: CircleCheck,
          color: "green"
        },
        {
          key: "assigned",
          label: "مخصصة",
          value: stats.assigned,
          icon: MapPin,
          color: "purple"
        }
      ]
    },
    {
      columns: 3,
      gap: "sm",
      items: [
        {
          key: "maintenance",
          label: "في الصيانة",
          value: stats.maintenance,
          icon: Settings,
          color: "orange"
        },
        {
          key: "outOfService",
          label: "خارج الخدمة",
          value: stats.outOfService,
          icon: Truck,
          color: "red"
        },
        {
          key: "inWarehouse",
          label: "في المستودع",
          value: stats.inWarehouse,
          icon: ChartColumn,
          color: "gray"
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
        { value: "maintenance", label: "صيانة" },
        { value: "out_of_service", label: "خارج الخدمة" },
        { value: "inactive", label: "غير نشط" }
      ]
    },
    {
      key: "type",
      label: "الفئة",
      type: "select",
      defaultValue: "all",
      options: [
        { value: "all", label: "جميع الفئات" },
        { value: "أدوات كهربائية", label: "أدوات كهربائية" },
        { value: "أدوات يدوية", label: "أدوات يدوية" },
        { value: "أدوات قياس", label: "أدوات قياس" },
        { value: "معدات لحام", label: "معدات لحام" },
        { value: "معدات حفر", label: "معدات حفر" },
        { value: "معدات قطع", label: "معدات قطع" },
        { value: "أدوات ربط", label: "أدوات ربط" },
        { value: "مواد كهربائية", label: "مواد كهربائية" },
        { value: "معدات أمان", label: "معدات أمان" },
        { value: "أدوات نقل", label: "أدوات نقل" }
      ]
    },
    {
      key: "project",
      label: "المشروع",
      type: "select",
      defaultValue: "all",
      options: [
        { value: "all", label: "جميع المواقع" },
        { value: "warehouse", label: "المستودع" },
        ...Array.isArray(projects) ? projects.map((project) => ({
          value: project.id,
          label: project.name
        })) : []
      ]
    }
  ], [projects]);
  const getStatusColor = (status) => {
    const colors = {
      "active": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      "maintenance": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      "out_of_service": "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      "inactive": "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
    };
    return colors[status] || colors.active;
  };
  const getStatusText = (status) => {
    const texts = {
      "active": "نشط",
      "maintenance": "صيانة",
      "out_of_service": "خارج الخدمة",
      "inactive": "غير نشط"
    };
    return texts[status] || status;
  };
  const getStatusBadgeVariant = (status) => {
    const variants = {
      "active": "success",
      "maintenance": "warning",
      "out_of_service": "destructive",
      "inactive": "secondary"
    };
    return variants[status] || "secondary";
  };
  const getHeaderColor = (status) => {
    const colors = {
      "active": "#22c55e",
      "maintenance": "#eab308",
      "out_of_service": "#ef4444",
      "inactive": "#6b7280"
    };
    return colors[status] || "#6b7280";
  };
  const handleEquipmentClick = (item) => {
    setSelectedEquipment(item);
    setShowEquipmentModal(true);
  };
  const handleTransferClick = (item, e) => {
    e?.stopPropagation();
    setSelectedEquipment(item);
    setShowTransferDialog(true);
  };
  const handleEditClick = (item, e) => {
    setSelectedEquipment(item);
    setShowDetailsDialog(true);
  };
  const handleMovementHistoryClick = (item, e) => {
    setSelectedEquipment(item);
    setShowMovementHistoryDialog(true);
  };
  const handleDeleteClick = (item, e) => {
    if (confirm(`هل أنت متأكد من حذف المعدة "${item.name}" نهائياً؟

لا يمكن التراجع عن هذا الإجراء.`)) {
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
      const ExcelJS = await __vitePreload(() => import("./index-BeuLVmQp.js").then((n) => n.e), true ? __vite__mapDeps([0,1]) : void 0);
      const workbook = new ExcelJS.Workbook();
      workbook.creator = COMPANY_INFO.name;
      workbook.lastModifiedBy = "نظام إدارة المعدات";
      workbook.created = /* @__PURE__ */ new Date();
      workbook.modified = /* @__PURE__ */ new Date();
      const worksheet = workbook.addWorksheet("كشف المعدات");
      worksheet.views = [{ rightToLeft: true }];
      const reportProjectName = filterValues.project === "all" ? "جميع المشاريع" : filterValues.project === "warehouse" ? "المستودع" : (Array.isArray(projects) ? projects.find((p) => p.id === filterValues.project)?.name : void 0) || "مشروع محدد";
      let currentRow = addReportHeader(
        worksheet,
        "كشف المعدات التفصيلي",
        `المشروع: ${reportProjectName}`,
        [
          `تاريخ الإصدار: ${formatDate((/* @__PURE__ */ new Date()).toISOString().split("T")[0])}`,
          `إجمالي المعدات: ${filteredEquipment.length}`,
          `المعدات النشطة: ${filteredEquipment.filter((e) => e.status === "active").length}`,
          `في الصيانة: ${filteredEquipment.filter((e) => e.status === "maintenance").length}`
        ]
      );
      const headers = ["الكود", "اسم المعدة", "الفئة", "الحالة", "الموقع", "سعر الشراء", "تاريخ الشراء", "الوصف"];
      const headerRow = worksheet.addRow(headers);
      headers.forEach((_, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.font = EXCEL_STYLES.fonts.header;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_STYLES.colors.headerBg } };
        cell.border = {
          top: EXCEL_STYLES.borders.medium,
          bottom: EXCEL_STYLES.borders.medium,
          left: EXCEL_STYLES.borders.thin,
          right: EXCEL_STYLES.borders.thin
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      worksheet.getColumn(1).width = 15;
      worksheet.getColumn(2).width = 25;
      worksheet.getColumn(3).width = 15;
      worksheet.getColumn(4).width = 15;
      worksheet.getColumn(5).width = 25;
      worksheet.getColumn(6).width = 18;
      worksheet.getColumn(7).width = 15;
      worksheet.getColumn(8).width = 30;
      currentRow++;
      filteredEquipment.forEach((item, index) => {
        const projectName = item.currentProjectId ? (Array.isArray(projects) ? projects.find((p) => p.id === item.currentProjectId)?.name : void 0) || "مشروع غير معروف" : "المستودع";
        const row = worksheet.addRow([
          item.code,
          item.name,
          item.type || "غير محدد",
          getStatusText(item.status),
          projectName,
          item.purchasePrice ? formatCurrency(Number(item.purchasePrice)) : "غير محدد",
          item.purchaseDate ? formatDate(item.purchaseDate) : "غير محدد",
          item.description || "غير محدد"
        ]);
        row.eachCell((cell, colNumber) => {
          cell.font = EXCEL_STYLES.fonts.data;
          cell.border = {
            top: EXCEL_STYLES.borders.thin,
            bottom: EXCEL_STYLES.borders.thin,
            left: EXCEL_STYLES.borders.thin,
            right: EXCEL_STYLES.borders.thin
          };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          if (colNumber === 6 && item.purchasePrice) {
            cell.numFmt = '#,##0 "ريال"';
            cell.alignment = { horizontal: "left", vertical: "middle" };
          }
          if (colNumber === 8) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
          }
          if (index % 2 === 0) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
          }
        });
        currentRow++;
      });
      const filenameProjectName = filterValues.project === "all" ? "جميع_المشاريع" : filterValues.project === "warehouse" ? "المستودع" : (Array.isArray(projects) ? projects.find((p) => p.id === filterValues.project)?.name : void 0)?.replace(/\s/g, "_") || "مشروع_محدد";
      const filename = `كشف_المعدات_${filenameProjectName}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      await downloadExcelFile(buffer, filename);
      toast({
        title: "تم تصدير كشف المعدات بنجاح",
        description: `تم حفظ الملف: ${filename}`
      });
    } catch (error) {
      console.error("خطأ في تصدير Excel:", error);
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
      const pdfProjectName = filterValues.project === "all" ? "جميع المشاريع" : filterValues.project === "warehouse" ? "المستودع" : (Array.isArray(projects) ? projects.find((p) => p.id === filterValues.project)?.name : void 0) || "مشروع محدد";
      const printContent = `
        <html dir="rtl">
          <head>
            <meta charset="UTF-8">
            <title>كشف المعدات - ${pdfProjectName}</title>
            <style>
              @page { margin: 2cm 1.5cm; size: A4; }
              body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; direction: rtl; }
              .company-header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 25px; text-align: center; border-radius: 12px; margin-bottom: 30px; }
              .company-name { font-size: 24px; font-weight: bold; margin: 0 0 10px 0; }
              .report-header { background: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-left: 6px solid #3b82f6; }
              .report-title { font-size: 22px; color: #1e293b; margin: 0; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 25px; background: white; }
              th { background: linear-gradient(135deg, #334155 0%, #475569 100%); color: white; padding: 15px 10px; text-align: center; font-weight: bold; }
              td { padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; }
              tr:nth-child(even) td { background-color: #f8fafc; }
            </style>
          </head>
          <body>
            <div class="company-header">
              <div class="company-name">شركة الفتيني للمقاولات والاستشارات الهندسية</div>
            </div>
            <div class="report-header">
              <div class="report-title">كشف المعدات التفصيلي - ${pdfProjectName}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>اسم المعدة</th>
                  <th>الفئة</th>
                  <th>الحالة</th>
                  <th>الموقع</th>
                  <th>السعر</th>
                </tr>
              </thead>
              <tbody>
                ${filteredEquipment.map((item) => {
        const itemProjectName = item.currentProjectId ? (Array.isArray(projects) ? projects.find((p) => p.id === item.currentProjectId)?.name : void 0) || "مشروع غير معروف" : "المستودع";
        return `
                    <tr>
                      <td>${item.code}</td>
                      <td>${item.name}</td>
                      <td>${item.type || "غير محدد"}</td>
                      <td>${getStatusText(item.status)}</td>
                      <td>${itemProjectName}</td>
                      <td>${item.purchasePrice ? formatCurrency(Number(item.purchasePrice)) : "غير محدد"}</td>
                    </tr>
                  `;
      }).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;
      const blob = new Blob([printContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank", "width=1200,height=800,scrollbars=yes,resizable=yes");
      if (printWindow) {
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 2e3);
        }, 1500);
        toast({
          title: "جاري إعداد الطباعة",
          description: "انتظر قليلاً ليتم تحميل المحتوى"
        });
      }
    } catch (error) {
      console.error("خطأ في تصدير PDF:", error);
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
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-64", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-gray-500", children: "جاري تحميل المعدات..." })
    ] }) }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 max-w-7xl mx-auto space-y-4", dir: "rtl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      UnifiedFilterDashboard,
      {
        statsRows: statsRowsConfig,
        searchValue,
        onSearchChange: setSearchValue,
        searchPlaceholder: "البحث بالاسم أو الكود...",
        filters: filtersConfig,
        filterValues,
        onFilterChange: handleFilterChange,
        onReset: handleResetFilters,
        onRefresh: handleRefresh,
        isRefreshing,
        actions: [
          {
            key: "export-excel",
            icon: Download,
            label: "تصدير Excel",
            onClick: exportEquipmentToExcel,
            variant: "outline",
            disabled: equipment.length === 0 || isExporting,
            tooltip: "تصدير إلى Excel"
          },
          {
            key: "export-pdf",
            icon: Printer,
            label: "طباعة PDF",
            onClick: exportEquipmentToPDF,
            variant: "outline",
            disabled: equipment.length === 0 || isExporting,
            tooltip: "طباعة كشف المعدات"
          }
        ]
      }
    ),
    equipment.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-400", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { className: "h-16 w-16 mx-auto opacity-50" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mt-4", children: "لا توجد معدات" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-500 dark:text-gray-400 mt-2", children: "لم يتم العثور على أي معدات تطابق الفلاتر المحددة" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => setShowAddDialog(true), className: "bg-blue-500 hover:bg-blue-600 text-white mt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4 mr-2" }),
        "إضافة معدة جديدة"
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(UnifiedCardGrid, { columns: 3, children: Array.isArray(equipment) && equipment.map((item) => {
      const projectName = item.currentProjectId ? (Array.isArray(projects) ? projects.find((p) => p.id === item.currentProjectId)?.name : void 0) || "مشروع غير معروف" : "المستودع";
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        UnifiedCard,
        {
          title: item.name,
          subtitle: item.code,
          titleIcon: Wrench,
          headerColor: getHeaderColor(item.status),
          onClick: () => handleEquipmentClick(item),
          badges: [
            {
              label: getStatusText(item.status),
              variant: getStatusBadgeVariant(item.status)
            },
            ...item.type ? [{
              label: item.type,
              variant: "secondary"
            }] : []
          ],
          fields: [
            {
              label: "الموقع",
              value: projectName,
              icon: MapPin
            },
            {
              label: "سعر الشراء",
              value: item.purchasePrice ? formatCurrency(Number(item.purchasePrice)) : "غير محدد",
              icon: DollarSign,
              emphasis: !!item.purchasePrice,
              color: item.purchasePrice ? "success" : "muted"
            },
            {
              label: "تاريخ الشراء",
              value: item.purchaseDate ? formatDate(item.purchaseDate) : "غير محدد",
              icon: Calendar
            },
            ...item.description ? [{
              label: "الوصف",
              value: item.description,
              icon: Wrench
            }] : []
          ],
          actions: [
            {
              icon: SquarePen,
              label: "تعديل",
              onClick: () => handleEditClick(item)
            },
            {
              icon: History,
              label: "السجل",
              onClick: () => handleMovementHistoryClick(item)
            },
            {
              icon: Trash2,
              label: "حذف",
              variant: "ghost",
              onClick: () => handleDeleteClick(item)
            }
          ],
          footer: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              onClick: (e) => {
                e.stopPropagation();
                handleTransferClick(item, e);
              },
              className: "w-full bg-blue-500 hover:bg-blue-600 text-white text-sm",
              size: "sm",
              children: "نقل المعدة"
            }
          ),
          compact: true
        },
        item.id
      );
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AddEquipmentDialog,
      {
        open: showAddDialog,
        onOpenChange: setShowAddDialog,
        projects
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AddEquipmentDialog,
      {
        open: showDetailsDialog,
        onOpenChange: setShowDetailsDialog,
        projects,
        equipment: selectedEquipment
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      TransferEquipmentDialog,
      {
        equipment: selectedEquipment,
        open: showTransferDialog,
        onOpenChange: setShowTransferDialog,
        projects
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      EquipmentMovementHistoryDialog,
      {
        equipment: selectedEquipment,
        open: showMovementHistoryDialog,
        onOpenChange: setShowMovementHistoryDialog,
        projects
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: showEquipmentModal, onOpenChange: setShowEquipmentModal, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { className: "max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl p-0 overflow-hidden border-0 shadow-2xl", children: selectedEquipment && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setShowEquipmentModal(false),
          className: "absolute top-4 right-4 z-10 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative h-48 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { className: "h-16 w-16 text-white opacity-50" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-gray-900 dark:text-gray-100", children: selectedEquipment.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-2 mt-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: `text-xs ${getStatusColor(selectedEquipment.status)}`, children: getStatusText(selectedEquipment.status) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-xs", children: selectedEquipment.code })
          ] })
        ] }),
        selectedEquipment.purchasePrice && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center bg-orange-100 dark:bg-orange-900/20 rounded-lg p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-orange-600 dark:text-orange-400", children: "السعر" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold text-orange-700 dark:text-orange-300", children: formatCurrency(Number(selectedEquipment.purchasePrice)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "h-4 w-4 text-green-500" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium text-gray-900 dark:text-gray-100", children: "الموقع الحالي" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: selectedEquipment.currentProjectId ? projects.find((p) => p.id === selectedEquipment.currentProjectId)?.name || "مشروع غير معروف" : "المستودع" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              onClick: () => {
                setShowEquipmentModal(false);
                handleEditClick(selectedEquipment);
              },
              className: "bg-blue-500 hover:bg-blue-600 text-white rounded-full py-3 font-medium text-sm",
              children: "تعديل"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              onClick: () => {
                setShowEquipmentModal(false);
                handleMovementHistoryClick(selectedEquipment);
              },
              className: "bg-purple-500 hover:bg-purple-600 text-white rounded-full py-3 font-medium text-sm flex items-center gap-1 justify-center",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "w-4 h-4" }),
                "السجل"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              onClick: () => {
                setShowEquipmentModal(false);
                handleDeleteClick(selectedEquipment);
              },
              disabled: deleteMutation.isPending,
              className: "bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-full py-3 font-medium text-sm",
              children: deleteMutation.isPending ? "جاري الحذف..." : "حذف"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              onClick: () => {
                setShowEquipmentModal(false);
                handleTransferClick(selectedEquipment);
              },
              className: "bg-green-500 hover:bg-green-600 text-white rounded-full py-3 font-medium text-sm",
              children: "نقل"
            }
          )
        ] })
      ] })
    ] }) }) }),
    enlargedImage && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4",
        onClick: () => setEnlargedImage(null),
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative max-w-4xl max-h-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setEnlargedImage(null),
              className: "absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 24 })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "img",
            {
              src: enlargedImage,
              alt: "صورة المعدة بالحجم الكامل",
              className: "max-w-full max-h-[90vh] object-contain rounded-lg"
            }
          )
        ] })
      }
    )
  ] });
}
export {
  EquipmentManagement,
  EquipmentManagement as default
};
