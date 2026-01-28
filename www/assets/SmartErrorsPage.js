import { am as createLucideIcon, r as reactExports, a as useToast, j as jsxRuntimeExports, ak as RefreshCw, B as Button, ac as Activity, b6 as Alert, aF as CircleCheck, b7 as AlertDescription, ad as Tabs, ae as TabsList, af as TabsTrigger, ah as TabsContent, l as Card, a8 as Database, aa as Clock, T as TrendingUp, aj as Progress, a6 as CardHeader, a7 as CardTitle, b8 as CardDescription, m as CardContent, ai as Badge, a9 as ChartColumn, ab as Shield, b9 as Eye, ba as ChartPie, aT as Bell, L as Label, K as Select, M as SelectTrigger, N as SelectValue, O as SelectContent, Q as SelectItem, ag as Settings, b3 as Zap, bb as Info, Z as CircleAlert, a_ as TriangleAlert } from "./index-BeuLVmQp.js";
import { S as Switch } from "./switch.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ChartLine = createLucideIcon("ChartLine", [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "c24i48" }],
  ["path", { d: "m19 9-5 5-4-4-3 3", key: "2osh9i" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Target = createLucideIcon("Target", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const TestTube = createLucideIcon("TestTube", [
  ["path", { d: "M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5c-1.4 0-2.5-1.1-2.5-2.5V2", key: "125lnx" }],
  ["path", { d: "M8.5 2h7", key: "csnxdl" }],
  ["path", { d: "M14.5 16h-5", key: "1ox875" }]
]);
const SmartErrorsPage = () => {
  const [statistics, setStatistics] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [testResult, setTestResult] = reactExports.useState(null);
  const [isTestingSystem, setIsTestingSystem] = reactExports.useState(false);
  const [settings, setSettings] = reactExports.useState({
    alertsEnabled: true,
    autoResolveEnabled: false,
    criticalNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    notificationCooldown: "60",
    errorRetention: "30",
    autoBackupEnabled: true,
    debugMode: false
  });
  const { toast } = useToast();
  const fetchStatistics = async () => {
    try {
      const response = await fetch("/api/smart-errors/statistics");
      const data = await response.json();
      if (data.success) {
        setStatistics(data.statistics);
      } else {
        toast({
          title: "خطأ في جلب البيانات",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("خطأ في جلب الإحصائيات:", error);
      toast({
        title: "خطأ في الشبكة",
        description: "لا يمكن جلب إحصائيات الأخطاء حالياً",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const testSmartErrorSystem = async () => {
    setIsTestingSystem(true);
    try {
      const response = await fetch("/api/smart-errors/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      if (data.success) {
        setTestResult(data.testError);
        toast({
          title: "نجح الاختبار! 🎯",
          description: data.message,
          variant: "default"
        });
        setTimeout(fetchStatistics, 1e3);
      } else {
        toast({
          title: "خطأ في الاختبار",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("خطأ في اختبار النظام:", error);
      toast({
        title: "خطأ في الاختبار",
        description: "حدث خطأ أثناء اختبار النظام الذكي",
        variant: "destructive"
      });
    } finally {
      setIsTestingSystem(false);
    }
  };
  reactExports.useEffect(() => {
    fetchStatistics();
  }, []);
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "critical":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-4 w-4" });
      case "high":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "h-4 w-4" });
      case "medium":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "h-4 w-4" });
      case "low":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4" });
      default:
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "h-4 w-4" });
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "container mx-auto p-6 space-y-1", dir: "rtl", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center h-64", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-8 w-8 animate-spin text-blue-600" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mr-3 text-lg", children: "جاري تحميل إحصائيات الأخطاء..." })
    ] }) });
  }
  const healthScore = statistics ? Math.max(0, 100 - statistics.totalErrors * 2 - statistics.recentErrors * 5) : 0;
  const saveSettings = async () => {
    try {
      toast({
        title: "تم حفظ الإعدادات",
        description: "تم تطبيق الإعدادات الجديدة بنجاح",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "خطأ في حفظ الإعدادات",
        description: "لم يتم حفظ الإعدادات، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto p-2 sm:p-4 space-y-1", dir: "rtl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            onClick: fetchStatistics,
            variant: "outline",
            size: "sm",
            disabled: loading,
            className: "flex-1 sm:flex-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `h-4 w-4 ml-1 ${loading ? "animate-spin" : ""}` }),
              "تحديث"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            onClick: testSmartErrorSystem,
            variant: "outline",
            size: "sm",
            disabled: isTestingSystem,
            className: "flex-1 sm:flex-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TestTube, { className: `h-4 w-4 ml-1 ${isTestingSystem ? "animate-pulse" : ""}` }),
              "اختبار النظام"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 bg-gray-50 p-2 rounded-lg", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "h-4 w-4 text-green-500" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium", children: "النظام نشط" })
      ] })
    ] }),
    testResult && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { className: "border-green-200 bg-green-50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4 text-green-600" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDescription, { className: "text-green-800", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "تم اختبار النظام بنجاح!" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "نوع الخطأ: ",
        testResult.type,
        " | الشدة: ",
        testResult.severity,
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "الرسالة: ",
        testResult.friendlyMessage,
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "البصمة: ",
        testResult.fingerprint,
        "..."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "overview", className: "space-y-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "grid w-full grid-cols-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "overview", children: "نظرة عامة" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "analysis", children: "التحليل المتقدم" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "settings", children: "الإعدادات" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "overview", className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-bold", children: statistics?.totalErrors || 0 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "إجمالي الأخطاء" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "h-5 w-5 text-blue-500" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-bold text-orange-600", children: statistics?.recentErrors || 0 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "أخطاء حديثة" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-5 w-5 text-orange-500" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-bold text-green-600", children: statistics?.resolvedErrors || 0 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "تم حلها" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-5 w-5 text-green-500" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `text-lg font-bold ${healthScore >= 90 ? "text-green-600" : healthScore >= 70 ? "text-yellow-600" : "text-red-600"}`, children: [
                  healthScore.toFixed(0),
                  "%"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "صحة النظام" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { className: `h-5 w-5 ${healthScore >= 90 ? "text-green-500" : healthScore >= 70 ? "text-yellow-500" : "text-red-500"}` })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Progress,
              {
                value: healthScore,
                className: "mt-2 h-1"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { className: "h-5 w-5" }),
              "توزيع الأخطاء حسب الشدة"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { children: "تصنيف الأخطاء حسب مستوى الخطورة" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1", children: Object.entries(statistics?.errorsBySeverity || {}).map(([severity, count]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Badge,
              {
                variant: "secondary",
                className: `${getSeverityColor(severity)} px-3 py-1`,
                children: [
                  getSeverityIcon(severity),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mr-2", children: severity === "critical" ? "حرج" : severity === "high" ? "عالي" : severity === "medium" ? "متوسط" : "منخفض" })
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-lg", children: count })
          ] }, severity)) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { className: "h-5 w-5" }),
              "أكثر الجداول تأثراً بالأخطاء"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { children: "الجداول التي تسجل أعلى نسبة أخطاء" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: Object.entries(statistics?.errorsByTable || {}).slice(0, 10).map(([tableName, count]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: tableName }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "outline", children: [
              count,
              " خطأ"
            ] })
          ] }, tableName)) }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "analysis", className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChartLine, { className: "h-5 w-5" }),
            "تحليل الاتجاهات الزمنية"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "space-y-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-blue-50 p-3 rounded-lg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { className: "h-4 w-4 text-blue-600" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-blue-800", children: "الاتجاه الحالي" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-bold text-blue-600", children: statistics?.recentErrors === 0 ? "مستقر" : "تحتاج متابعة" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-blue-600 mt-1", children: "بناءً على البيانات الحديثة" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-green-50 p-3 rounded-lg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-4 w-4 text-green-600" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-green-800", children: "مستوى الأمان" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-bold text-green-600", children: healthScore >= 90 ? "ممتاز" : healthScore >= 70 ? "جيد" : "يحتاج تحسين" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-green-600 mt-1", children: "تقييم عام للنظام" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-orange-50 p-3 rounded-lg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-4 w-4 text-orange-600" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-orange-800", children: "المراقبة" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-bold text-orange-600", children: "نشطة" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-orange-600 mt-1", children: "رصد مستمر 24/7" })
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChartPie, { className: "h-5 w-5" }),
            "تفصيل أنواع الأخطاء"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: Object.keys(statistics?.errorsByType || {}).length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: Object.entries(statistics?.errorsByType || {}).map(([type, count]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-2 bg-gray-50 rounded", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: type }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-20 bg-gray-200 rounded-full h-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "bg-blue-600 h-2 rounded-full",
                  style: {
                    width: `${Math.min(100, count / Math.max(1, statistics?.totalErrors || 1) * 100)}%`
                  }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", children: count })
            ] })
          ] }, type)) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-2 text-gray-500", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { className: "h-12 w-12 mx-auto opacity-50" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "لا توجد أخطاء مسجلة للتحليل" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs mt-1", children: 'استخدم زر "اختبار النظام" لإنشاء بيانات تجريبية' })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "h-5 w-5" }),
            "مؤشرات الأداء الرئيسية"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center p-3 border rounded-lg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold text-blue-600", children: "99.9%" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-600", children: "وقت التشغيل" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center p-3 border rounded-lg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold text-green-600", children: "< 1s" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-600", children: "زمن الاستجابة" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center p-3 border rounded-lg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold text-purple-600", children: "24/7" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-600", children: "المراقبة" })
            ] })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "settings", className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "h-5 w-5" }),
            "إعدادات الإشعارات"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm font-medium", children: "تفعيل التنبيهات" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-500", children: "استقبال إشعارات فورية" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Switch,
                  {
                    checked: settings.alertsEnabled,
                    onCheckedChange: (checked) => setSettings((prev) => ({ ...prev, alertsEnabled: checked }))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm font-medium", children: "إشعارات الأخطاء الحرجة" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-500", children: "تنبيهات فورية للأخطاء الحرجة" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Switch,
                  {
                    checked: settings.criticalNotifications,
                    onCheckedChange: (checked) => setSettings((prev) => ({ ...prev, criticalNotifications: checked }))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm font-medium", children: "إشعارات البريد الإلكتروني" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-500", children: "إرسال تقارير عبر البريد" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Switch,
                  {
                    checked: settings.emailNotifications,
                    onCheckedChange: (checked) => setSettings((prev) => ({ ...prev, emailNotifications: checked }))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm font-medium", children: "إشعارات الرسائل النصية" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-500", children: "تنبيهات SMS للأخطاء الحرجة" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Switch,
                  {
                    checked: settings.smsNotifications,
                    onCheckedChange: (checked) => setSettings((prev) => ({ ...prev, smsNotifications: checked }))
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm font-medium block", children: "فترة التهدئة للإشعارات (ثانية)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Select,
                  {
                    value: settings.notificationCooldown,
                    onValueChange: (value) => setSettings((prev) => ({ ...prev, notificationCooldown: value })),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "30", children: "30 ثانية" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "60", children: "دقيقة واحدة" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "300", children: "5 دقائق" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "600", children: "10 دقائق" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "1800", children: "30 دقيقة" })
                      ] })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm font-medium block", children: "مدة الاحتفاظ بالأخطاء (يوم)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Select,
                  {
                    value: settings.errorRetention,
                    onValueChange: (value) => setSettings((prev) => ({ ...prev, errorRetention: value })),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "7", children: "7 أيام" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "30", children: "30 يوم" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "90", children: "90 يوم" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "180", children: "6 شهور" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "365", children: "سنة واحدة" })
                      ] })
                    ]
                  }
                )
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "h-5 w-5" }),
            "إعدادات النظام"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "space-y-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm font-medium", children: "الحل التلقائي للأخطاء" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-500", children: "حل الأخطاء البسيطة تلقائياً" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Switch,
                {
                  checked: settings.autoResolveEnabled,
                  onCheckedChange: (checked) => setSettings((prev) => ({ ...prev, autoResolveEnabled: checked }))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm font-medium", children: "النسخ الاحتياطي التلقائي" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-500", children: "إنشاء نسخ احتياطية دورية" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Switch,
                {
                  checked: settings.autoBackupEnabled,
                  onCheckedChange: (checked) => setSettings((prev) => ({ ...prev, autoBackupEnabled: checked }))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm font-medium", children: "وضع التطوير" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-500", children: "معلومات تفصيلية للمطورين" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Switch,
                {
                  checked: settings.debugMode,
                  onCheckedChange: (checked) => setSettings((prev) => ({ ...prev, debugMode: checked }))
                }
              )
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row gap-2 justify-end", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              onClick: saveSettings,
              className: "flex items-center gap-2",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "h-4 w-4" }),
                "حفظ الإعدادات"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              onClick: () => setSettings({
                alertsEnabled: true,
                autoResolveEnabled: false,
                criticalNotifications: true,
                emailNotifications: true,
                smsNotifications: false,
                notificationCooldown: "60",
                errorRetention: "30",
                autoBackupEnabled: true,
                debugMode: false
              }),
              variant: "outline",
              children: "إعادة تعيين"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "h-5 w-5" }),
            "معلومات النظام"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4 text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-500", children: "الإصدار" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: "v2.1.0" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-500", children: "آخر تحديث" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: "اليوم" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-500", children: "وقت التشغيل" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: "24/7" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-gray-500", children: "الحالة" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium text-green-600", children: "نشط" })
            ] })
          ] }) })
        ] })
      ] })
    ] })
  ] });
};
export {
  SmartErrorsPage as default
};
