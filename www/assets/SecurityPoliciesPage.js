import { am as createLucideIcon, r as reactExports, aS as useUnifiedFilter, f as useQuery, b3 as Zap, b4 as ShieldCheck, T as TrendingUp, j as jsxRuntimeExports, a$ as UnifiedStats, ad as Tabs, ae as TabsList, af as TabsTrigger, bc as UnifiedSearchFilter, bd as AnimatePresence, ah as TabsContent, n as UnifiedCardGrid, be as motion, o as UnifiedCard, b9 as Eye, aF as CircleCheck, bf as Lock, a_ as TriangleAlert, aa as Clock, ab as Shield, l as Card, a6 as CardHeader, a7 as CardTitle, m as CardContent, B as Button } from "./index-BeuLVmQp.js";
import { R as ResponsiveContainer, A as AreaChart, C as CartesianGrid, X as XAxis, Y as YAxis, T as Tooltip, a as Area } from "./AreaChart.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CircleX = createLucideIcon("CircleX", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
  ["path", { d: "m9 9 6 6", key: "z0biqf" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ShieldAlert = createLucideIcon("ShieldAlert", [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "M12 8v4", key: "1got3b" }],
  ["path", { d: "M12 16h.01", key: "1drbdi" }]
]);
function SecurityPoliciesPage() {
  const [activeTab, setActiveTab] = reactExports.useState("policies");
  const {
    searchValue,
    filterValues,
    onSearchChange,
    onFilterChange,
    onReset
  } = useUnifiedFilter({
    status: "all",
    severity: "all"
  });
  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ["/api/security/policies"],
    queryFn: async () => {
      const response = await fetch("/api/security/policies");
      if (!response.ok) throw new Error("فشل في جلب السياسات الأمنية");
      const result = await response.json();
      return result.success ? result.data : result;
    }
  });
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ["/api/security/suggestions"],
    queryFn: async () => {
      const response = await fetch("/api/security/suggestions");
      if (!response.ok) throw new Error("فشل في جلب اقتراحات السياسات");
      const result = await response.json();
      return result.success ? result.data : result;
    }
  });
  const { data: violations = [], isLoading: violationsLoading } = useQuery({
    queryKey: ["/api/security/violations"],
    queryFn: async () => {
      const response = await fetch("/api/security/violations");
      if (!response.ok) throw new Error("فشل في جلب انتهاكات السياسات");
      const result = await response.json();
      return result.success ? result.data : result;
    }
  });
  const filteredPolicies = policies.filter(
    (policy) => (policy.title.toLowerCase().includes(searchValue.toLowerCase()) || policy.description.toLowerCase().includes(searchValue.toLowerCase())) && (filterValues.status === "all" || policy.status === filterValues.status) && (filterValues.severity === "all" || policy.severity === filterValues.severity)
  );
  const statsItems = [
    { title: "مؤشر الأمان", value: "85%", icon: Zap, color: "orange" },
    { title: "السياسات النشطة", value: policies.filter((p) => p.status === "active").length, icon: ShieldCheck, color: "green" },
    { title: "انتهاكات حرجة", value: violations.filter((v) => v.violation.severity === "critical").length, icon: ShieldAlert, color: "red" },
    { title: "اقتراحات ذكية", value: suggestions.filter((s) => s.status === "pending").length, icon: TrendingUp, color: "blue" }
  ];
  const chartData = [
    { name: "الأحد", violations: 4 },
    { name: "الاثنين", violations: 3 },
    { name: "الثلاثاء", violations: 7 },
    { name: "الأربعاء", violations: 5 },
    { name: "الخميس", violations: 2 },
    { name: "الجمعة", violations: 0 },
    { name: "السبت", violations: 1 }
  ];
  const policyFilters = [
    {
      key: "status",
      label: "الحالة",
      type: "select",
      options: [
        { value: "all", label: "جميع الحالات" },
        { value: "active", label: "نشط" },
        { value: "draft", label: "مسودة" },
        { value: "inactive", label: "غير نشط" }
      ]
    },
    {
      key: "severity",
      label: "المستوى",
      type: "select",
      options: [
        { value: "all", label: "جميع المستويات" },
        { value: "critical", label: "حرج" },
        { value: "high", label: "عالي" },
        { value: "medium", label: "متوسط" },
        { value: "low", label: "منخفض" }
      ]
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto px-2 sm:px-4 py-4 space-y-6", dir: "rtl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(UnifiedStats, { stats: statsItems, columns: 4 }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:col-span-2 space-y-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, className: "w-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-4 mb-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "w-full sm:w-auto p-1 rounded-xl h-11", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "policies", className: "rounded-lg px-6 h-9", children: "السياسات" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "suggestions", className: "rounded-lg px-6 h-9", children: "الاقتراحات" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "violations", className: "rounded-lg px-6 h-9", children: "الانتهاكات" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            UnifiedSearchFilter,
            {
              searchValue,
              onSearchChange,
              searchPlaceholder: "بحث في السياسات...",
              filters: activeTab === "policies" ? policyFilters : [],
              filterValues,
              onFilterChange,
              onReset,
              className: "w-full sm:w-80",
              showActiveFilters: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(AnimatePresence, { mode: "wait", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "policies", children: /* @__PURE__ */ jsxRuntimeExports.jsx(UnifiedCardGrid, { columns: 2, children: filteredPolicies.map((policy) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            motion.div,
            {
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                UnifiedCard,
                {
                  title: policy.title,
                  subtitle: policy.policyId,
                  titleIcon: Shield,
                  headerColor: policy.status === "active" ? "#10b981" : "#64748b",
                  badges: [
                    {
                      label: policy.severity === "critical" ? "حرج" : policy.severity === "high" ? "عالي" : "متوسط",
                      variant: policy.severity === "critical" ? "destructive" : policy.severity === "high" ? "warning" : "default"
                    },
                    {
                      label: policy.status === "active" ? "نشط" : "مسودة",
                      variant: policy.status === "active" ? "success" : "secondary"
                    }
                  ],
                  fields: [
                    { label: "الفئة", value: policy.category, icon: Lock },
                    { label: "الانتهاكات", value: policy.violationsCount, icon: TriangleAlert, color: policy.violationsCount > 0 ? "danger" : "success" },
                    { label: "آخر تحديث", value: new Date(policy.updatedAt).toLocaleDateString("ar"), icon: Clock, color: "muted" }
                  ],
                  actions: [
                    { icon: Eye, label: "عرض التفاصيل", onClick: () => {
                    } },
                    { icon: CircleCheck, label: "تفعيل", onClick: () => {
                    }, hidden: policy.status === "active" }
                  ]
                }
              )
            },
            policy.id
          )) }) }, "policies"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "suggestions", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: suggestions.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            motion.div,
            {
              initial: { opacity: 0, scale: 0.98 },
              animate: { opacity: 1, scale: 1 },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                UnifiedCard,
                {
                  title: s.title,
                  subtitle: `اقتراح ذكي - ثقة ${s.confidence}%`,
                  titleIcon: Zap,
                  fields: [
                    { label: "الوصف", value: s.description },
                    { label: "الفئة", value: s.category, icon: Lock }
                  ],
                  actions: [
                    { icon: CircleCheck, label: "تطبيق", onClick: () => {
                    }, color: "green" },
                    { icon: CircleX, label: "رفض", onClick: () => {
                    }, color: "red" }
                  ]
                }
              )
            },
            s.id
          )) }) }, "suggestions"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "violations", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: violations.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            motion.div,
            {
              initial: { opacity: 0, x: 20 },
              animate: { opacity: 1, x: 0 },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                UnifiedCard,
                {
                  title: v.violation.violatedRule,
                  subtitle: `السياسة: ${v.policy?.title || "غير محدد"}`,
                  titleIcon: ShieldAlert,
                  headerColor: "#ef4444",
                  fields: [
                    { label: "التوقيت", value: new Date(v.violation.detectedAt).toLocaleString("ar"), icon: Clock },
                    { label: "المستوى", value: v.violation.severity, color: "danger" }
                  ],
                  actions: [
                    { icon: Eye, label: "تحليل", onClick: () => {
                    } }
                  ]
                }
              )
            },
            v.violation.id
          )) }) }, "violations")
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-0 shadow-sm overflow-hidden bg-card rounded-xl", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "text-base flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { className: "w-4 h-4 text-primary" }),
            "تحليل الانتهاكات الأسبوعي"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-[200px] w-full mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AreaChart, { data: chartData, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("defs", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("linearGradient", { id: "colorViolations", x1: "0", y1: "0", x2: "0", y2: "1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "5%", stopColor: "hsl(var(--primary))", stopOpacity: 0.3 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "95%", stopColor: "hsl(var(--primary))", stopOpacity: 0 })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false, stroke: "hsl(var(--border))" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "name", hide: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, { hide: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Tooltip,
              {
                contentStyle: { borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Area, { type: "monotone", dataKey: "violations", stroke: "hsl(var(--primary))", strokeWidth: 3, fillOpacity: 1, fill: "url(#colorViolations)" })
          ] }) }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-bold flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-4 h-4 text-destructive" }),
              "آخر الانتهاكات"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "link", className: "text-xs", children: "مشاهدة الكل" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: violations.slice(0, 4).map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 bg-card rounded-xl border flex items-center gap-4 group cursor-pointer hover:border-destructive/30 transition-all", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 bg-destructive/10 rounded-lg group-hover:scale-110 transition-transform", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "w-4 h-4 text-destructive" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold truncate", children: v.violation.violatedRule }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground", children: new Date(v.violation.detectedAt).toLocaleTimeString("ar") })
            ] })
          ] }, v.violation.id)) })
        ] })
      ] })
    ] })
  ] });
}
export {
  SecurityPoliciesPage
};
