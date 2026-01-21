import { am as createLucideIcon, r as reactExports, a as useToast, b as useQueryClient, aN as useAuth, f as useQuery, an as useForm, g as useMutation, j as jsxRuntimeExports, B as Button, S as Send, w as Dialog, x as DialogContent, y as DialogHeader, z as DialogTitle, A as DialogDescription, ao as Form, ap as FormField, aq as FormItem, ar as FormLabel, as as FormControl, I as Input, at as FormMessage, K as Select, M as SelectTrigger, N as SelectValue, O as SelectContent, Q as SelectItem, U as Users, ab as Shield, t as User, aO as UserCheck, aP as UserSelect, ay as Textarea, az as t, aA as objectType, aB as stringType, aQ as enumType, aR as numberType, aS as useUnifiedFilter, aT as Bell, Z as CircleAlert, aF as CircleCheck, ak as RefreshCw, aU as cn, aV as DropdownMenu, aW as DropdownMenuTrigger, aX as DropdownMenuContent, aY as DropdownMenuItem, k as Download, aZ as DropdownMenuSeparator, a_ as TriangleAlert, a$ as UnifiedStats, ad as Tabs, ae as TabsList, af as TabsTrigger, a9 as ChartColumn, i as UnifiedFilterDashboard, ah as TabsContent, n as UnifiedCardGrid, o as UnifiedCard, T as TrendingUp, b0 as Smartphone, b1 as Mail, b2 as MessageSquare, b3 as Zap, q as Trash2, ag as Settings, b4 as ShieldCheck, H as format, b5 as ar } from "./index-BD1Qzn1x.js";
import { S as Sparkles } from "./sparkles.js";
import { U as Upload } from "./upload.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const EllipsisVertical = createLucideIcon("EllipsisVertical", [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "12", cy: "5", r: "1", key: "gxeob9" }],
  ["circle", { cx: "12", cy: "19", r: "1", key: "lyex9k" }]
]);
const notificationSchema = objectType({
  type: enumType(["safety", "task", "payroll", "announcement", "system"]),
  title: stringType().min(1, "العنوان مطلوب"),
  body: stringType().min(1, "المحتوى مطلوب"),
  priority: numberType().min(1).max(5),
  recipientType: enumType(["all", "admins", "workers", "specific"]),
  specificUserId: stringType().optional()
});
const notificationTypes = [
  {
    value: "safety",
    label: "تنبيه أمني",
    description: "تنبيهات السلامة والأمان",
    icon: "🚨",
    color: "from-red-500 to-red-600"
  },
  {
    value: "task",
    label: "إشعار مهمة",
    description: "إشعارات المهام والواجبات",
    icon: "📝",
    color: "from-blue-500 to-blue-600"
  },
  {
    value: "payroll",
    label: "إشعار راتب",
    description: "إشعارات الرواتب والمستحقات",
    icon: "💰",
    color: "from-green-500 to-green-600"
  },
  {
    value: "announcement",
    label: "إعلان عام",
    description: "إعلانات عامة للجميع",
    icon: "📢",
    color: "from-purple-500 to-purple-600"
  },
  {
    value: "system",
    label: "إشعار نظام",
    description: "إشعارات النظام التلقائية",
    icon: "⚙️",
    color: "from-gray-500 to-gray-600"
  }
];
const priorityLevels = [
  { value: 1, label: "حرج جداً", color: "text-red-600", bg: "bg-red-50 border-red-200" },
  { value: 2, label: "عاجل", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  { value: 3, label: "متوسط", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  { value: 4, label: "منخفض", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { value: 5, label: "معلومة", color: "text-gray-600", bg: "bg-gray-50 border-gray-200" }
];
function CreateNotificationDialog({
  onUpdate,
  notificationType = "announcement",
  projectId
}) {
  const [open, setOpen] = reactExports.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getAccessToken } = useAuth();
  const [selectedRecipientType, setSelectedRecipientType] = reactExports.useState("all");
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": getAccessToken() ? `Bearer ${getAccessToken()}` : ""
  });
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users", "with-roles"],
    queryFn: async () => {
      const response = await fetch("/api/users?includeRole=true", {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error("فشل في جلب المستخدمين");
      return response.json();
    },
    enabled: open
  });
  const form = useForm({
    resolver: t(notificationSchema),
    defaultValues: {
      type: notificationType,
      title: "",
      body: "",
      priority: 3,
      recipientType: "all",
      specificUserId: void 0
    }
  });
  const createNotificationMutation = useMutation({
    mutationFn: async (data) => {
      let endpoint = "/api/notifications";
      switch (data.type) {
        case "safety":
          endpoint = "/api/notifications/safety";
          break;
        case "task":
          endpoint = "/api/notifications/task";
          break;
        case "payroll":
          endpoint = "/api/notifications/payroll";
          break;
        case "announcement":
          endpoint = "/api/notifications/announcement";
          break;
        default:
          endpoint = "/api/notifications";
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...data,
          projectId,
          recipients: data.recipientType === "specific" && data.specificUserId ? [data.specificUserId] : data.recipientType
        })
      });
      if (!response.ok) throw new Error("فشل في إنشاء الإشعار");
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast({ title: "تم بنجاح", description: "تم إنشاء الإشعار بنجاح" });
      setOpen(false);
      form.reset();
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      toast({ title: "خطأ", description: "فشل في إنشاء الإشعار", variant: "destructive" });
    }
  });
  const onSubmit = (data) => {
    createNotificationMutation.mutate({ ...data, projectId });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => setOpen(true), className: "gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-4 w-4" }),
      "إنشاء إشعار"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "w-full max-w-[95vw] md:max-w-[600px] border-0 p-0 overflow-hidden bg-white rounded-xl md:rounded-2xl shadow-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { className: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 md:p-5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 md:gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-9 h-9 md:w-10 md:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4 md:h-5 md:w-5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-base md:text-lg font-bold", children: "إنشاء إشعار" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "text-blue-100 text-xs md:text-sm mt-0.5", children: "أرسل إشعاراً للمستخدمين عبر قنوات النظام" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 md:p-5 overflow-y-auto max-h-[80vh]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Form, { ...form, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: form.handleSubmit(onSubmit), className: "space-y-3 md:space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "title",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "العنوان" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { ...field, placeholder: "أدخل العنوان..." }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormField,
            {
              control: form.control,
              name: "type",
              render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "النوع" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { onValueChange: field.onChange, defaultValue: field.value, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "اختر النوع" }) }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: notificationTypes.map((type) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: type.value, children: type.label }, type.value)) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormField,
            {
              control: form.control,
              name: "priority",
              render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "الأولوية" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { onValueChange: (val) => field.onChange(parseInt(val)), defaultValue: field.value.toString(), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "اختر الأولوية" }) }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: priorityLevels.map((level) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: level.value.toString(), children: level.label }, level.value)) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "recipientType",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "المستقبلين" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: [
                { value: "all", label: "الجميع", icon: Users },
                { value: "admins", label: "المسؤولين", icon: Shield },
                { value: "workers", label: "الموظفين", icon: User },
                { value: "specific", label: "محدد", icon: UserCheck }
              ].map((option) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  type: "button",
                  variant: field.value === option.value ? "default" : "outline",
                  size: "sm",
                  className: "gap-1.5",
                  onClick: () => field.onChange(option.value),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(option.icon, { className: "h-3.5 w-3.5" }),
                    option.label
                  ]
                },
                option.value
              )) }),
              field.value === "specific" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                FormField,
                {
                  control: form.control,
                  name: "specificUserId",
                  render: ({ field: userField }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      UserSelect,
                      {
                        value: userField.value || "",
                        onValueChange: userField.onChange,
                        users: users.map((u) => ({
                          id: u.id,
                          fullName: u.firstName || u.name || "بدون اسم",
                          email: u.email
                        })),
                        placeholder: "اختر المستخدم..."
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
                  ] })
                }
              ) })
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "body",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "المحتوى" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { ...field, placeholder: "اكتب الرسالة...", rows: 4, className: "resize-none" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3 pt-4 border-t", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", variant: "outline", className: "flex-1", onClick: () => setOpen(false), children: "إلغاء" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", className: "flex-1", disabled: createNotificationMutation.isPending, children: createNotificationMutation.isPending ? "جاري الإرسال..." : "إرسال الإشعار" })
        ] })
      ] }) }) })
    ] }) })
  ] });
}
function AdminNotificationsPage() {
  const { toast } = useToast();
  const { isAuthenticated, getAccessToken, isLoading: isAuthLoading } = useAuth();
  const [selectedTab, setSelectedTab] = reactExports.useState("overview");
  const filterConfigs = [
    {
      key: "type",
      label: "النوع",
      type: "select",
      options: [
        { value: "all", label: "الكل" },
        { value: "safety", label: "تنبيه أمني" },
        { value: "task", label: "إشعار مهمة" },
        { value: "payroll", label: "إشعار راتب" },
        { value: "announcement", label: "إعلان عام" },
        { value: "system", label: "إشعار نظام" }
      ]
    },
    {
      key: "priority",
      label: "الأولوية",
      type: "select",
      options: [
        { value: "all", label: "الكل" },
        { value: "1", label: "حرج جداً" },
        { value: "2", label: "عاجل" },
        { value: "3", label: "متوسط" },
        { value: "4", label: "منخفض" },
        { value: "5", label: "معلومة" }
      ]
    }
  ];
  const { searchValue, filterValues, onSearchChange, onFilterChange, onReset } = useUnifiedFilter(
    { type: "all", priority: "all" },
    ""
  );
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": getAccessToken() ? `Bearer ${getAccessToken()}` : ""
  });
  const { data: notificationsData, isLoading: isLoadingNotifications, refetch } = useQuery({
    queryKey: ["admin-notifications", filterValues, searchValue],
    queryFn: async () => {
      const params = new URLSearchParams({
        requesterId: "admin",
        limit: "50",
        ...filterValues.type !== "all" && { type: filterValues.type },
        ...filterValues.priority !== "all" && { priority: filterValues.priority },
        ...searchValue && { search: searchValue }
      });
      const response = await fetch(`/api/admin/notifications/all?${params}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error("فشل في جلب البيانات");
      return response.json();
    },
    enabled: isAuthenticated && !isAuthLoading
  });
  const { data: activityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["user-activity"],
    queryFn: async () => {
      const response = await fetch("/api/admin/notifications/user-activity?requesterId=admin", {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error("فشل في جلب النشاط");
      return response.json();
    },
    enabled: isAuthenticated && !isAuthLoading
  });
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`/api/admin/notifications/${id}?requesterId=admin`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error("فشل الحذف");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "تم حذف الإشعار بنجاح" });
      refetch();
    }
  });
  const notifications = notificationsData?.notifications || [];
  const stats = reactExports.useMemo(() => {
    const total = notificationsData?.total || 0;
    const unread = notifications.filter((n) => !n.isRead).length;
    const critical = notifications.filter((n) => n.priority === 1 || n.priority === "critical").length;
    const readRate = total > 0 ? Math.round((total - unread) / total * 100) : 0;
    return [
      {
        title: "إجمالي الإشعارات",
        value: total,
        icon: Bell,
        color: "blue"
      },
      {
        title: "إشعارات حرجة",
        value: critical,
        icon: CircleAlert,
        color: "red",
        status: critical > 0 ? "critical" : "normal"
      },
      {
        title: "معدل القراءة",
        value: `${readRate}%`,
        icon: CircleCheck,
        color: "green",
        trend: { value: 5, isPositive: true }
      },
      {
        title: "نشاط المستخدمين",
        value: activityData?.userStats?.length || 0,
        icon: Users,
        color: "purple"
      }
    ];
  }, [notificationsData, notifications, activityData]);
  const priorityMap = {
    "1": { label: "حرج", color: "destructive" },
    "critical": { label: "حرج", color: "destructive" },
    "2": { label: "عاجل", color: "warning" },
    "high": { label: "عاجل", color: "warning" },
    "3": { label: "متوسط", color: "default" },
    "medium": { label: "متوسط", color: "default" },
    "4": { label: "منخفض", color: "secondary" },
    "low": { label: "منخفض", color: "secondary" },
    "5": { label: "معلومة", color: "outline" },
    "info": { label: "معلومة", color: "outline" }
  };
  const typeIcons = {
    safety: ShieldCheck,
    task: CircleCheck,
    payroll: Zap,
    announcement: MessageSquare,
    system: Settings
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background pb-10", dir: "rtl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container flex h-16 items-center justify-between gap-4 px-4 sm:px-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "h-6 w-6" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-bold tracking-tight", children: "إشعارات النظام" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground hidden sm:block", children: "إدارة التواصل والتنبيهات الأمنية" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => refetch(), disabled: isLoadingNotifications, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-4 w-4 ml-2", isLoadingNotifications && "animate-spin") }),
          "تحديث"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CreateNotificationDialog, { onUpdate: () => refetch() }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(EllipsisVertical, { className: "h-5 w-5" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { className: "gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4" }),
              " تصدير"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { className: "gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-4 w-4" }),
              " استيراد"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { className: "gap-2 text-destructive", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-4 w-4" }),
              " مسح السجل"
            ] })
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "container px-4 py-6 sm:px-8 space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        UnifiedStats,
        {
          stats,
          columns: 4,
          title: "نظرة عامة على الإشعارات",
          subtitle: "مؤشرات أداء نظام التنبيهات خلال آخر 30 يوم"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: selectedTab, onValueChange: setSelectedTab, className: "space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-4 flex-wrap", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "grid w-full sm:w-auto grid-cols-3 sm:flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "overview", className: "gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { className: "h-4 w-4" }),
              " الإحصائيات"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "notifications", className: "gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "h-4 w-4" }),
              " السجل"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "users", className: "gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-4 w-4" }),
              " المستخدمين"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            UnifiedFilterDashboard,
            {
              searchValue,
              onSearchChange,
              filters: filterConfigs,
              filterValues,
              onFilterChange,
              onReset,
              compact: true,
              className: "w-full lg:w-auto"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "overview", className: "mt-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(UnifiedCardGrid, { columns: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            UnifiedCard,
            {
              title: "أكثر المستخدمين تفاعلاً",
              titleIcon: TrendingUp,
              fields: activityData?.userStats?.slice(0, 5).map((u, i) => ({
                label: `${i + 1}. ${u.userName}`,
                value: `${u.readNotifications} / ${u.totalNotifications}`,
                emphasis: i === 0,
                color: i === 0 ? "success" : "default"
              })) || [],
              footer: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", className: "w-full text-xs", onClick: () => setSelectedTab("users"), children: "عرض التفاصيل الكاملة" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            UnifiedCard,
            {
              title: "توزيع القنوات",
              titleIcon: Zap,
              fields: [
                { label: "إشعارات التطبيق", value: notifications.length, icon: Smartphone, color: "info" },
                { label: "البريد الإلكتروني", value: "مفعل", icon: Mail, color: "success" },
                { label: "الرسائل النصية", value: "متوقف", icon: MessageSquare, color: "muted" },
                { label: "تنبيهات فورية", value: "نشط", icon: Zap, color: "warning" }
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "notifications", className: "mt-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(UnifiedCardGrid, { columns: 3, children: isLoadingNotifications ? Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(UnifiedCard, { title: "", fields: [], isLoading: true }, i)) : notifications.length > 0 ? notifications.map((notif) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          UnifiedCard,
          {
            title: notif.title,
            subtitle: format(new Date(notif.createdAt), "PPp", { locale: ar }),
            titleIcon: typeIcons[notif.type] || Bell,
            badges: [
              {
                label: priorityMap[notif.priority]?.label || "عادي",
                variant: priorityMap[notif.priority]?.color || "outline"
              },
              {
                label: notif.isRead ? "مقروء" : "جديد",
                variant: notif.isRead ? "secondary" : "default"
              }
            ],
            fields: [
              { label: "المحتوى", value: notif.message, emphasis: true },
              { label: "المستهدف", value: notif.recipientType === "all" ? "الجميع" : "محدد", color: "info" }
            ],
            actions: [
              {
                icon: Trash2,
                label: "حذف",
                onClick: () => deleteMutation.mutate(notif.id),
                color: "red"
              }
            ],
            compact: true
          },
          notif.id
        )) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-full py-20 text-center border-2 border-dashed rounded-xl", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "mx-auto h-12 w-12 text-muted-foreground/20" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-4 text-lg font-semibold", children: "لا توجد إشعارات" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: "لم يتم العثور على إشعارات تطابق معايير البحث." })
        ] }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "users", className: "mt-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(UnifiedCardGrid, { columns: 3, children: activityData?.userStats?.map((user) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          UnifiedCard,
          {
            title: user.userName,
            subtitle: user.userEmail,
            titleIcon: Users,
            fields: [
              { label: "إشعارات مستلمة", value: user.totalNotifications, color: "info" },
              { label: "إشعارات مقروءة", value: user.readNotifications, color: "success" },
              { label: "آخر نشاط", value: user.lastReadAt ? format(new Date(user.lastReadAt), "PP", { locale: ar }) : "أبداً", color: "muted" }
            ],
            compact: true
          },
          user.userId
        )) }) })
      ] })
    ] })
  ] });
}
export {
  AdminNotificationsPage as default
};
