import { am as createLucideIcon, bo as getDB, a as useToast, r as reactExports, bp as useSyncData, j as jsxRuntimeExports, ad as Tabs, ae as TabsList, af as TabsTrigger, ag as Settings, a8 as Database, aT as Bell, bf as Lock, ah as TabsContent, l as Card, a6 as CardHeader, a7 as CardTitle, b0 as Smartphone, b8 as CardDescription, m as CardContent, L as Label, K as Select, M as SelectTrigger, N as SelectValue, O as SelectContent, Q as SelectItem, al as Separator, B as Button, k as Download, ak as RefreshCw, q as Trash2, a_ as TriangleAlert, ab as Shield, bq as getSyncStats } from "./index-BD1Qzn1x.js";
import { S as Switch } from "./switch.js";
import { U as Upload } from "./upload.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Moon = createLucideIcon("Moon", [
  ["path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z", key: "a7tn18" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Palette = createLucideIcon("Palette", [
  ["circle", { cx: "13.5", cy: "6.5", r: ".5", fill: "currentColor", key: "1okk4w" }],
  ["circle", { cx: "17.5", cy: "10.5", r: ".5", fill: "currentColor", key: "f64h9f" }],
  ["circle", { cx: "8.5", cy: "7.5", r: ".5", fill: "currentColor", key: "fotxhn" }],
  ["circle", { cx: "6.5", cy: "12.5", r: ".5", fill: "currentColor", key: "qy21gx" }],
  [
    "path",
    {
      d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",
      key: "12rzf8"
    }
  ]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Sun = createLucideIcon("Sun", [
  ["circle", { cx: "12", cy: "12", r: "4", key: "4exip2" }],
  ["path", { d: "M12 2v2", key: "tus03m" }],
  ["path", { d: "M12 20v2", key: "1lh1kg" }],
  ["path", { d: "m4.93 4.93 1.41 1.41", key: "149t6j" }],
  ["path", { d: "m17.66 17.66 1.41 1.41", key: "ptbguv" }],
  ["path", { d: "M2 12h2", key: "1t8f8n" }],
  ["path", { d: "M20 12h2", key: "1q8mjw" }],
  ["path", { d: "m6.34 17.66-1.41 1.41", key: "1m8zz5" }],
  ["path", { d: "m19.07 4.93-1.41 1.41", key: "1shlcs" }]
]);
async function exportLocalData() {
  const db = await getDB();
  const stores = ["syncQueue", "userData", "projects", "workers", "materials", "suppliers", "expenses"];
  const exportData = {};
  for (const store of stores) {
    const tx = db.transaction(store, "readonly");
    const objectStore = tx.objectStore(store);
    exportData[store] = await objectStore.getAll();
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `binarjoin-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return "تم تصدير البيانات بنجاح";
}
async function importLocalData(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    const db = await getDB();
    const stores = Object.keys(data);
    for (const storeName of stores) {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      await store.clear();
      const items = data[storeName];
      if (Array.isArray(items)) {
        for (const item of items) {
          await store.put(item);
        }
      }
      await tx.done;
    }
    console.log("[Offline] تم استيراد البيانات بنجاح");
  } catch (error) {
    console.error("[Offline] خطأ في استيراد البيانات:", error);
    throw new Error("فشل استيراد البيانات: تنسيق غير صالح");
  }
}
async function clearAllLocalData() {
  try {
    const db = await getDB();
    const entities = [
      "projects",
      "workers",
      "materials",
      "suppliers",
      "workerAttendance",
      "materialPurchases",
      "transportationExpenses",
      "fundTransfers",
      "workerTransfers",
      "workerMiscExpenses",
      "wells",
      "projectTypes"
    ];
    for (const entity of entities) {
      const records = await db.getAll(entity);
      for (const record of records) {
        await db.delete(entity, record.id);
      }
    }
    console.log("🧹 [Cleanup] تم مسح جميع البيانات المحلية");
    return true;
  } catch (error) {
    console.error("❌ [Cleanup] خطأ في مسح البيانات:", error);
    return false;
  }
}
function SettingsPage() {
  const { toast } = useToast();
  const [isDarkMode, setIsDarkMode] = reactExports.useState(false);
  const { manualSync, isSyncing, isOnline } = useSyncData();
  const [stats, setStats] = reactExports.useState(null);
  const [isImporting, setIsImporting] = reactExports.useState(false);
  const loadStats = async () => {
    const s = await getSyncStats();
    setStats(s);
  };
  reactExports.useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
    loadStats();
  }, []);
  const handleExport = async () => {
    try {
      await exportLocalData();
      toast({ title: "تم التصدير بنجاح", description: "تم حفظ نسخة احتياطية من بياناتك المحلية" });
    } catch (error) {
      toast({ title: "خطأ في التصدير", variant: "destructive" });
    }
  };
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await importLocalData(event.target?.result);
        await loadStats();
        toast({ title: "تم الاستيراد بنجاح", description: "تم تحديث البيانات المحلية من النسخة الاحتياطية" });
      } catch (error) {
        toast({ title: "خطأ في الاستيراد", description: "تأكد من صحة ملف النسخة الاحتياطية", variant: "destructive" });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };
  const handleClear = async () => {
    if (confirm("هل أنت متأكد من مسح جميع البيانات المحلية؟ سيتم حذف جميع العمليات غير المتزامنة.")) {
      await clearAllLocalData();
      await loadStats();
      toast({ title: "تم مسح البيانات", description: "تم تنظيف قاعدة البيانات المحلية بنجاح" });
    }
  };
  const toggleDarkMode = (checked) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    toast({
      title: checked ? "تم تفعيل الوضع الليلي" : "تم تفعيل الوضع النهاري",
      duration: 2e3
    });
  };
  const handleSaveSettings = () => {
    toast({
      title: "تم حفظ الإعدادات",
      description: "تم تحديث تفضيلاتك بنجاح"
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "container mx-auto p-4 max-w-4xl animate-in fade-in duration-500 pb-20", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "general", className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "bg-muted/50 p-1 rounded-xl w-full justify-start overflow-x-auto h-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "general", className: "rounded-lg gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "h-4 w-4" }),
        "عام"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "offline", className: "rounded-lg gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "h-4 w-4" }),
        "البيانات (Offline)"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "appearance", className: "rounded-lg gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Palette, { className: "h-4 w-4" }),
        "المظهر"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "notifications", className: "rounded-lg gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "h-4 w-4" }),
        "التنبيهات"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "security", className: "rounded-lg gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-4 w-4" }),
        "الأمان"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "general", className: "space-y-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border/40 shadow-sm rounded-2xl overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "text-lg flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Smartphone, { className: "h-5 w-5 text-blue-500" }),
          "تفضيلات التطبيق"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { children: "الإعدادات الأساسية لواجهة التطبيق" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-base", children: "لغة النظام" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "اختر اللغة المفضلة لواجهة المستخدم" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "ar", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-[140px] rounded-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "اختر اللغة" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "ar", children: "العربية" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "en", children: "English" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, { className: "opacity-50" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-base", children: "تحديث تلقائي" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "تحديث البيانات بشكل دوري في الخلفية" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { defaultChecked: true })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "offline", className: "space-y-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border/40 shadow-sm rounded-2xl overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "text-lg flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "h-5 w-5 text-blue-500" }),
          "إدارة البيانات المحلية (Offline)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { children: "تحكم في البيانات المخزنة على جهازك والمزامنة مع السيرفر" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-border/50", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mb-1", children: "عمليات معلقة للمزامنة" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl font-bold text-orange-600", children: stats?.pendingSync || 0 })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-border/50", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mb-1", children: "بيانات محلية محفوظة" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl font-bold text-blue-600", children: stats?.localUserData || 0 })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2 pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "gap-2 rounded-xl", onClick: handleExport, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-3.5 w-3.5" }),
            "تصدير نسخة"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "gap-2 rounded-xl", disabled: isImporting, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-3.5 w-3.5" }),
              "استيراد نسخة"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "file",
                accept: ".json",
                className: "absolute inset-0 opacity-0 cursor-pointer",
                onChange: handleImport,
                disabled: isImporting
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "secondary",
              size: "sm",
              className: "gap-2 rounded-xl",
              onClick: () => manualSync(),
              disabled: !isOnline || isSyncing || stats?.pendingSync === 0,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}` }),
                "مزامنة الآن"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", size: "sm", className: "gap-2 rounded-xl text-destructive hover:bg-destructive/10", onClick: handleClear, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }),
            "مسح البيانات"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-xl flex gap-3 items-start", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-5 w-5 text-yellow-600 shrink-0 mt-0.5" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-yellow-800 dark:text-yellow-200 leading-relaxed", children: "يتم تخزين بياناتك محلياً لتمكينك من العمل بدون إنترنت. عند مسح البيانات المحلية، ستفقد أي عمليات لم يتم مزامنتها مع السيرفر بعد." })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "appearance", className: "space-y-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border/40 shadow-sm rounded-2xl overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "text-lg flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Palette, { className: "h-5 w-5 text-purple-500" }),
          "تخصيص المظهر"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { children: "تغيير ألوان وسمات التطبيق" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { className: "text-base flex items-center gap-2", children: [
              isDarkMode ? /* @__PURE__ */ jsxRuntimeExports.jsx(Moon, { className: "h-4 w-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Sun, { className: "h-4 w-4" }),
              "الوضع الليلي"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "تبديل بين الوضع الفاتح والداكن" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              checked: isDarkMode,
              onCheckedChange: toggleDarkMode
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, { className: "opacity-50" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-base", children: "حجم الخط" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "تعديل حجم خط النصوص في التطبيق" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "medium", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-[140px] rounded-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "اختر الحجم" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "small", children: "صغير" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "medium", children: "متوسط" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "large", children: "كبير" })
            ] })
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "notifications", className: "space-y-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border/40 shadow-sm rounded-2xl overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "text-lg flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "h-5 w-5 text-orange-500" }),
          "إعدادات التنبيهات"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { children: "إدارة كيفية استلام الإشعارات" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-base", children: "إشعارات الدفع (Push)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "استلام تنبيهات على المتصفح أو الجهاز" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { defaultChecked: true })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, { className: "opacity-50" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-base", children: "تنبيهات المصروفات" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "الإخطار عند تسجيل مصروفات كبيرة" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { defaultChecked: true })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, { className: "opacity-50" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-base", children: "تنبيهات الحضور" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "الإخطار عند اكتمال كشف الحضور اليومي" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, {})
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "security", className: "space-y-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border/40 shadow-sm rounded-2xl overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "text-lg flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-5 w-5 text-green-500" }),
          "الأمان والخصوصية"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { children: "إعدادات حماية الحساب والبيانات" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-base", children: "التحقق بخطوتين (2FA)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "إضافة طبقة حماية إضافية لحسابك" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", className: "rounded-xl", children: "تفعيل" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, { className: "opacity-50" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-base", children: "قفل التطبيق" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "طلب كلمة مرور عند فتح التطبيق" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, {})
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", className: "rounded-xl px-8", children: "إلغاء" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: handleSaveSettings, className: "rounded-xl px-8", children: "حفظ التغييرات" })
    ] })
  ] }) });
}
export {
  SettingsPage as default
};
