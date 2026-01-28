import { a as useToast, b as useQueryClient, r as reactExports, c as useFloatingButton, f as useQuery, g as useMutation, j as jsxRuntimeExports, l as Card, a6 as CardHeader, a7 as CardTitle, a8 as Database, m as CardContent, a9 as ChartColumn, aa as Clock, ab as Shield, ac as Activity, ad as Tabs, ae as TabsList, af as TabsTrigger, ag as Settings, ah as TabsContent, T as TrendingUp, ai as Badge, aj as Progress, Z as CircleAlert, B as Button, q as Trash2, ak as RefreshCw, al as Separator, V as apiRequest } from "./index-BeuLVmQp.js";
function AutocompleteAdminPage() {
  const { toast } = useToast();
  useQueryClient();
  const [isMaintenanceRunning, setIsMaintenanceRunning] = reactExports.useState(false);
  const { setFloatingAction } = useFloatingButton();
  reactExports.useEffect(() => {
    const handleRunMaintenance2 = () => {
      if (!isMaintenanceRunning) {
        setIsMaintenanceRunning(true);
        maintenanceMutation.mutate();
      }
    };
    setFloatingAction(handleRunMaintenance2, "تشغيل الصيانة");
    return () => setFloatingAction(null);
  }, [setFloatingAction, isMaintenanceRunning]);
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["autocomplete-admin", "stats"],
    queryFn: async () => {
      const response = await apiRequest("/api/autocomplete-admin/stats", "GET");
      return response?.data || response;
    }
  });
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/autocomplete-admin/cleanup", "POST");
      return response?.data || response;
    },
    onSuccess: (result) => {
      toast({
        title: "تم التنظيف بنجاح",
        description: `تم حذف ${result.deletedCount} سجل قديم من ${result.categories.length} فئة`
      });
      refetchStats();
    },
    onError: () => {
      toast({
        title: "خطأ في التنظيف",
        description: "فشل في تنظيف البيانات القديمة",
        variant: "destructive"
      });
    }
  });
  const enforceLimitsMutation = useMutation({
    mutationFn: async (category) => {
      const response = await apiRequest("/api/autocomplete-admin/enforce-limits", "POST", { category });
      return response?.data || response;
    },
    onSuccess: (result) => {
      toast({
        title: "تم تطبيق الحدود بنجاح",
        description: `تم تقليم ${result.trimmedCategories.length} فئة وحذف ${result.deletedCount} سجل`
      });
      refetchStats();
    },
    onError: () => {
      toast({
        title: "خطأ في تطبيق الحدود",
        description: "فشل في تطبيق حدود الفئات",
        variant: "destructive"
      });
    }
  });
  const maintenanceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/autocomplete-admin/maintenance", "POST");
      return response?.data || response;
    },
    onSuccess: (result) => {
      toast({
        title: "اكتملت الصيانة الشاملة",
        description: `معالجة ${result.totalProcessed} سجل بنجاح`
      });
      refetchStats();
      setIsMaintenanceRunning(false);
    },
    onError: () => {
      toast({
        title: "خطأ في الصيانة",
        description: "فشل في تشغيل الصيانة الشاملة",
        variant: "destructive"
      });
      setIsMaintenanceRunning(false);
    }
  });
  const handleRunMaintenance = () => {
    setIsMaintenanceRunning(true);
    maintenanceMutation.mutate();
  };
  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-US").format(num);
  };
  if (statsLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "container mx-auto p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center items-center h-64", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" }) }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800", dir: "rtl", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-1 sm:space-y-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3 sm:gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl transition-all duration-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xs sm:text-sm font-medium opacity-90", children: "إجمالي السجلات" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "h-4 w-4 sm:h-5 sm:w-5 opacity-80" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "pt-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl sm:text-2xl lg:text-3xl font-bold", children: formatNumber(stats?.totalRecords || 0) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs opacity-80", children: "سجل في النظام" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-xl transition-all duration-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xs sm:text-sm font-medium opacity-90", children: "عدد الفئات" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { className: "h-4 w-4 sm:h-5 sm:w-5 opacity-80" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "pt-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl sm:text-2xl lg:text-3xl font-bold", children: formatNumber(stats?.categoriesCount || 0) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs opacity-80", children: "فئة مختلفة" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-xl transition-all duration-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xs sm:text-sm font-medium opacity-90", children: "السجلات القديمة" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-4 w-4 sm:h-5 sm:w-5 opacity-80" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "pt-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl sm:text-2xl lg:text-3xl font-bold", children: formatNumber(stats?.oldRecordsCount || 0) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs opacity-80", children: "تحتاج تنظيف" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: `border-0 shadow-lg text-white hover:shadow-xl transition-all duration-300 ${stats?.oldRecordsCount === 0 ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gradient-to-br from-yellow-500 to-yellow-600"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xs sm:text-sm font-medium opacity-90", children: "حالة النظام" }),
          stats?.oldRecordsCount === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-4 w-4 sm:h-5 sm:w-5 opacity-80" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "h-4 w-4 sm:h-5 sm:w-5 opacity-80" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "pt-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg sm:text-xl lg:text-2xl font-bold", children: stats?.oldRecordsCount === 0 ? "ممتاز" : "يحتاج صيانة" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs opacity-80", children: stats?.oldRecordsCount === 0 ? "النظام محسّن" : "يحتاج تنظيف" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "overview", className: "w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TabsTrigger,
          {
            value: "overview",
            className: "data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200 text-sm sm:text-base font-medium rounded-md",
            "data-testid": "tab-overview",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4 sm:w-5 sm:h-5 ml-2" }),
              "نظرة عامة"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TabsTrigger,
          {
            value: "categories",
            className: "data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200 text-sm sm:text-base font-medium rounded-md",
            "data-testid": "tab-categories",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { className: "w-4 h-4 sm:w-5 sm:h-5 ml-2" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "تفصيل" }),
              " الفئات"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TabsTrigger,
          {
            value: "maintenance",
            className: "data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200 text-sm sm:text-base font-medium rounded-md",
            "data-testid": "tab-maintenance",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "w-4 h-4 sm:w-5 sm:h-5 ml-2" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "أدوات" }),
              " الصيانة"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "overview", className: "p-4 sm:p-6 space-y-1 sm:space-y-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-0 shadow-md bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-gray-900", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { className: "h-5 w-5 text-blue-600 dark:text-blue-400" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-lg sm:text-xl text-gray-900 dark:text-white", children: "صحة النظام" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-gray-700 dark:text-gray-300", children: "كفاءة البيانات" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-2xl font-bold text-blue-600 dark:text-blue-400", children: [
                  stats && stats.totalRecords > 0 ? Math.round((stats.totalRecords - stats.oldRecordsCount) / stats.totalRecords * 100) : 0,
                  "%"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: stats && stats.totalRecords > 0 && (stats.totalRecords - stats.oldRecordsCount) / stats.totalRecords * 100 > 80 ? "default" : "secondary", children: stats && stats.totalRecords > 0 && (stats.totalRecords - stats.oldRecordsCount) / stats.totalRecords * 100 > 80 ? "ممتاز" : "يحتاج تحسين" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Progress,
              {
                value: stats && stats.totalRecords > 0 ? (stats.totalRecords - stats.oldRecordsCount) / stats.totalRecords * 100 : 0,
                className: "h-3 bg-gray-200 dark:bg-gray-700"
              }
            )
          ] }),
          stats && stats.oldRecordsCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-5 h-5 text-orange-600" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium text-orange-800 dark:text-orange-200 text-sm sm:text-base", children: [
                  "تحذير: يوجد ",
                  formatNumber(stats.oldRecordsCount),
                  " سجل قديم"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  size: "sm",
                  variant: "outline",
                  className: "w-fit border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-300",
                  onClick: () => cleanupMutation.mutate(),
                  disabled: cleanupMutation.isPending,
                  "data-testid": "button-quick-cleanup",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4 ml-1" }),
                    "تنظيف سريع"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-orange-600 dark:text-orange-300 mt-2 mr-7 sm:mr-0", children: "هذه السجلات لم تُستخدم لأكثر من 6 أشهر وتم استخدامها أقل من 3 مرات" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-green-50 dark:bg-green-900/20 p-4 rounded-lg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "w-4 h-4 text-green-600" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-green-800 dark:text-green-200 text-sm", children: "السجلات النشطة" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-bold text-green-600", children: formatNumber((stats?.totalRecords || 0) - (stats?.oldRecordsCount || 0)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "w-4 h-4 text-blue-600" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-blue-800 dark:text-blue-200 text-sm", children: "متوسط الاستخدام" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-bold text-blue-600", children: stats?.categoryBreakdown ? Math.round(stats.categoryBreakdown.reduce((acc, cat) => acc + (cat.avgUsage || 0), 0) / stats.categoryBreakdown.length) || 0 : 0 })
            ] })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "categories", className: "p-4 sm:p-6 space-y-1 sm:space-y-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-0 shadow-md", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 bg-green-100 dark:bg-green-900/50 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { className: "h-5 w-5 text-green-600 dark:text-green-400" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-lg sm:text-xl text-gray-900 dark:text-white", children: "تفصيل الفئات" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "الاستخدام والإحصائيات" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              size: "sm",
              variant: "outline",
              onClick: () => enforceLimitsMutation.mutate(void 0),
              disabled: enforceLimitsMutation.isPending,
              className: "w-full sm:w-auto",
              "data-testid": "button-enforce-all-limits",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "w-4 h-4 ml-1" }),
                "تطبيق الحدود على الكل"
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
          stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 && stats.categoryBreakdown.map((category, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col lg:flex-row lg:items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-medium text-gray-900 dark:text-white truncate", children: category.category }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Badge,
                    {
                      variant: category.count > 100 ? "destructive" : category.count > 50 ? "default" : "secondary",
                      className: "text-xs",
                      children: category.count > 100 ? "مرتفع" : category.count > 50 ? "متوسط" : "منخفض"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500 dark:text-gray-400 block", children: "عدد السجلات" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-lg text-gray-900 dark:text-white", children: formatNumber(category.count) })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500 dark:text-gray-400 block", children: "متوسط الاستخدام" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-lg text-blue-600 dark:text-blue-400", children: isNaN(category.avgUsage) || !isFinite(category.avgUsage) ? "0.0" : category.avgUsage.toFixed(1) })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2 sm:col-span-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500 dark:text-gray-400 block", children: "الحالة" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `font-medium ${category.count > 100 ? "text-red-600" : category.count > 50 ? "text-yellow-600" : "text-green-600"}`, children: category.count > 100 ? "يحتاج تقليم" : category.count > 50 ? "مراقبة" : "صحي" })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 lg:flex-col lg:gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    size: "sm",
                    variant: category.count > 100 ? "destructive" : "outline",
                    onClick: () => enforceLimitsMutation.mutate(category.category),
                    disabled: enforceLimitsMutation.isPending,
                    className: "flex-1 lg:flex-none lg:w-20 transition-all duration-200",
                    "data-testid": `button-trim-${index}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3 h-3 sm:w-4 sm:h-4 ml-1" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs sm:text-sm", children: "تقليم" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-center text-gray-500 dark:text-gray-400 lg:w-20", children: [
                  Math.round(category.count / (stats?.totalRecords || 1) * 100),
                  "%"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Progress,
                {
                  value: Math.min(category.count / 100 * 100, 100),
                  className: "h-2"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "الحد الأقصى (100)" })
              ] })
            ] })
          ] }, category.category)),
          (!stats?.categoryBreakdown || stats.categoryBreakdown.length === 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-8 text-gray-500 dark:text-gray-400", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { className: "w-12 h-12 mx-auto opacity-50" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "لا توجد فئات محفوظة بعد" })
          ] })
        ] }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "maintenance", className: "p-4 sm:p-6 space-y-1 sm:space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-0 shadow-md bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 bg-red-100 dark:bg-red-900/50 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-5 w-5 text-red-600 dark:text-red-400" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-lg text-gray-900 dark:text-white", children: "تنظيف البيانات القديمة" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "حذف السجلات غير المستخدمة" })
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-gray-800 p-4 rounded-lg border", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-700 dark:text-gray-300", children: [
                  "حذف السجلات التي لم تُستخدم لأكثر من ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "6 أشهر" }),
                  " والمستخدمة أقل من ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "3 مرات" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-sm", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500", children: "السجلات المستهدفة:" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: stats?.oldRecordsCount === 0 ? "secondary" : "destructive", children: [
                    formatNumber(stats?.oldRecordsCount || 0),
                    " سجل"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  onClick: () => cleanupMutation.mutate(),
                  disabled: cleanupMutation.isPending,
                  className: "w-full transition-all duration-200",
                  variant: stats?.oldRecordsCount === 0 ? "secondary" : "destructive",
                  size: "lg",
                  "data-testid": "button-cleanup",
                  children: cleanupMutation.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 ml-2 animate-spin" }),
                    "جاري التنظيف..."
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4 ml-2" }),
                    "تنظيف البيانات القديمة"
                  ] })
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "h-5 w-5 text-blue-600 dark:text-blue-400" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-lg text-gray-900 dark:text-white", children: "تطبيق حدود الفئات" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "تحسين أداء النظام" })
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-gray-800 p-4 rounded-lg border", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-700 dark:text-gray-300", children: [
                  "فرض حد أقصى ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "100 اقتراح" }),
                  " لكل فئة وحذف الأقل استخداماً"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-sm", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500", children: "الفئات المتأثرة:" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "secondary", children: [
                    stats?.categoryBreakdown?.filter((cat) => cat.count > 100).length || 0,
                    " فئة"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  onClick: () => enforceLimitsMutation.mutate(void 0),
                  disabled: enforceLimitsMutation.isPending,
                  className: "w-full transition-all duration-200",
                  variant: "outline",
                  size: "lg",
                  "data-testid": "button-enforce-limits",
                  children: enforceLimitsMutation.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 ml-2 animate-spin" }),
                    "جاري التطبيق..."
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "w-4 h-4 ml-2" }),
                    "تطبيق الحدود"
                  ] })
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, { className: "my-6" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-6 w-6 text-white" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xl text-gray-900 dark:text-white", children: "صيانة شاملة للنظام" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "تحسين وتنظيف شامل للنظام" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-xs bg-white dark:bg-gray-800", children: "موصى به شهرياً" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 sm:p-6 rounded-xl border border-blue-200 dark:border-blue-800", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-5 h-5" }),
                "ما تتضمنه الصيانة الشاملة:"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-2 h-2 bg-blue-500 rounded-full" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-blue-700 dark:text-blue-300", children: "حذف السجلات القديمة وغير المستخدمة" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-2 h-2 bg-green-500 rounded-full" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-blue-700 dark:text-blue-300", children: "تطبيق حدود على جميع الفئات" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-2 h-2 bg-purple-500 rounded-full" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-blue-700 dark:text-blue-300", children: "تحسين فهارس قاعدة البيانات" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-2 h-2 bg-orange-500 rounded-full" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-blue-700 dark:text-blue-300", children: "إعادة تنظيم ترتيب الاقتراحات" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-5 h-5 text-yellow-600 mt-0.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium text-yellow-800 dark:text-yellow-200 text-sm", children: "تحذير هام" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-yellow-700 dark:text-yellow-300 mt-1", children: "قد تستغرق العملية عدة دقائق حسب حجم البيانات. لا تغلق الصفحة أثناء التشغيل." })
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                onClick: handleRunMaintenance,
                disabled: isMaintenanceRunning || maintenanceMutation.isPending,
                className: "w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300",
                size: "lg",
                "data-testid": "button-comprehensive-maintenance",
                children: isMaintenanceRunning || maintenanceMutation.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 ml-2 animate-spin" }),
                  "جاري تشغيل الصيانة الشاملة..."
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 ml-2" }),
                  "تشغيل الصيانة الشاملة"
                ] })
              }
            )
          ] })
        ] })
      ] })
    ] })
  ] }) });
}
export {
  AutocompleteAdminPage as default
};
