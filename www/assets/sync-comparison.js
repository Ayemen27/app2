import { am as createLucideIcon, a as useToast, r as reactExports, j as jsxRuntimeExports, a8 as Database, l as Card, a6 as CardHeader, a7 as CardTitle, m as CardContent, I as Input, B as Button, ak as RefreshCw, bO as ChevronDown, bP as ChevronRight, bM as CircleCheckBig, Z as CircleAlert, V as apiRequest, bo as getDB } from "./index-BD1Qzn1x.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Table2 = createLucideIcon("Table2", [
  [
    "path",
    {
      d: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",
      key: "gugj83"
    }
  ]
]);
function SyncComparisonPage() {
  const { toast } = useToast();
  const [comparisons, setComparisons] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [totalServerRecords, setTotalServerRecords] = reactExports.useState(0);
  const [totalLocalRecords, setTotalLocalRecords] = reactExports.useState(0);
  const [expandedTable, setExpandedTable] = reactExports.useState(null);
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [filterStatus, setFilterStatus] = reactExports.useState("all");
  const loadComparison = async () => {
    setIsLoading(true);
    try {
      const serverResponse = await apiRequest("/api/sync/compare", "GET");
      const { stats, tableDetails, tables } = serverResponse.data;
      const db = await getDB();
      const localData = {};
      for (const tableName of tables || Object.keys(stats || {})) {
        try {
          const records = await db.getAll(tableName);
          localData[tableName] = records.length;
        } catch (err) {
          localData[tableName] = 0;
        }
      }
      const results = [];
      let totalServer = 0;
      let totalLocal = 0;
      for (const tableName of tables || Object.keys(stats || {})) {
        const serverCount = stats?.[tableName] || 0;
        const localCount = localData[tableName] || 0;
        const columns = tableDetails?.[tableName]?.columns || [];
        totalServer += serverCount;
        totalLocal += localCount;
        let status = "synced";
        if (serverCount === 0 && localCount === 0) status = "synced";
        else if (localCount === 0) status = "missing";
        else if (serverCount !== localCount) status = "partial";
        results.push({
          tableName,
          serverCount,
          localCount,
          difference: Math.abs(serverCount - localCount),
          isSynced: serverCount === localCount,
          columns,
          status
        });
      }
      results.sort((a, b) => {
        if (a.isSynced !== b.isSynced) return a.isSynced ? 1 : -1;
        return b.difference - a.difference;
      });
      setComparisons(results);
      setTotalServerRecords(totalServer);
      setTotalLocalRecords(totalLocal);
      toast({
        title: "تم المقارنة بنجاح",
        description: `${results.length} جدول | الخادم: ${totalServer} | المحلي: ${totalLocal}`
      });
    } catch (error) {
      toast({
        title: "خطأ في المقارنة",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  reactExports.useEffect(() => {
    loadComparison();
  }, []);
  const filtered = comparisons.filter((c) => {
    const matchesSearch = c.tableName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || (filterStatus === "synced" ? c.isSynced : !c.isSynced);
    return matchesSearch && matchesFilter;
  });
  const unsyncedCount = comparisons.filter((c) => !c.isSynced).length;
  const totalDifference = comparisons.reduce((sum, c) => sum + c.difference, 0);
  const syncPercentage = comparisons.length > 0 ? ((comparisons.length - unsyncedCount) / comparisons.length * 100).toFixed(1) : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto p-6 space-y-6", "data-testid": "sync-comparison-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-3xl font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "w-8 h-8" }),
        "مقارنة شاملة للمزامنة"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-600 dark:text-slate-400 mt-2", children: "مقارنة 66 جدول بين قاعدة البيانات المحلية والخادم" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-sm font-medium", children: "الجداول الكلية" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-3xl font-bold", children: comparisons.length }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-sm font-medium", children: "سجلات الخادم" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-3xl font-bold text-blue-600", children: totalServerRecords.toLocaleString() }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-sm font-medium", children: "السجلات المحلية" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-3xl font-bold text-green-600", children: totalLocalRecords.toLocaleString() }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-sm font-medium", children: "نسبة التزامن" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `text-3xl font-bold ${syncPercentage === "100" ? "text-green-600" : "text-yellow-600"}`, children: [
          syncPercentage,
          "%"
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-sm font-medium", children: "غير متزامن" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-3xl font-bold ${unsyncedCount === 0 ? "text-green-600" : "text-red-600"}`, children: unsyncedCount }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          placeholder: "ابحث عن جدول...",
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          className: "flex-1",
          "data-testid": "input-search-table"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2", children: ["all", "synced", "unsynced"].map((status) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: filterStatus === status ? "default" : "outline",
          onClick: () => setFilterStatus(status),
          "data-testid": `button-filter-${status}`,
          children: status === "all" ? "الكل" : status === "synced" ? "متزامن" : "غير متزامن"
        },
        status
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          onClick: loadComparison,
          disabled: isLoading,
          "data-testid": "button-refresh-comparison",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}` }),
            isLoading ? "جاري..." : "تحديث"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Table2, { className: "w-5 h-5" }),
        "تفاصيل الجداول (",
        filtered.length,
        ")"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", "data-testid": "sync-comparison-table", children: filtered.map((comp) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: `border rounded-lg p-4 cursor-pointer transition ${comp.isSynced ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}`,
          "data-testid": `table-row-${comp.tableName}`,
          onClick: () => setExpandedTable(expandedTable === comp.tableName ? null : comp.tableName),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 flex-1", children: [
                expandedTable === comp.tableName ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "w-5 h-5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "w-5 h-5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: comp.tableName }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-600 dark:text-slate-400", children: [
                    comp.columns.length,
                    " عمود"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm font-semibold", children: [
                    "خادم: ",
                    comp.serverCount
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm", children: [
                    "محلي: ",
                    comp.localCount
                  ] })
                ] }),
                comp.isSynced ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-6 h-6 text-green-600" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-6 h-6 text-red-600" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-bold text-red-600", children: [
                    "-",
                    comp.difference
                  ] })
                ] })
              ] })
            ] }),
            expandedTable === comp.tableName && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 pt-4 border-t space-y-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "font-semibold text-sm mb-2", children: [
                "الأعمدة (",
                comp.columns.length,
                "):"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2", children: comp.columns.map((col) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded",
                  children: col
                },
                col
              )) })
            ] }) })
          ]
        },
        comp.tableName
      )) }) })
    ] }),
    totalDifference > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "text-yellow-800 dark:text-yellow-200 flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-5 h-5" }),
        "ملخص الاختلافات"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-3 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "إجمالي السجلات المختلفة:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "float-right text-lg font-bold text-red-600", children: totalDifference })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "الجداول المتأثرة:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "float-right text-lg font-bold", children: unsyncedCount })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-600 dark:text-slate-400 pt-2", children: "اضغط على أي جدول لعرض تفاصيل الأعمدة والبيانات الكاملة." })
      ] })
    ] })
  ] });
}
export {
  SyncComparisonPage as default
};
