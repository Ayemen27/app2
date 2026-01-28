import { a as useToast, aN as useAuth, f as useQuery, g as useMutation, j as jsxRuntimeExports, by as LoaderCircle, ab as Shield, B as Button, ak as RefreshCw, l as Card, a6 as CardHeader, a7 as CardTitle, U as Users, m as CardContent, bz as Table, bA as TableHeader, bB as TableRow, bC as TableHead, bD as TableBody, bE as TableCell, ai as Badge, K as Select, M as SelectTrigger, N as SelectValue, O as SelectContent, Q as SelectItem, bF as Briefcase, b9 as Eye, bG as queryClient, V as apiRequest } from "./index-BeuLVmQp.js";
function UsersManagementPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { data: allUsers, isLoading, refetch } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("/api/users", "GET");
      return res;
    }
  });
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      const res = await apiRequest(`/api/users/${userId}/role`, "PATCH", { role });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "تم تحديث الصلاحيات",
        description: "تم تغيير دور المستخدم بنجاح."
      });
    },
    onError: (error) => {
      toast({
        title: "فشل التحديث",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center min-h-[400px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-8 w-8 animate-spin text-blue-600" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center shadow-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-6 w-6 text-blue-600" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-black text-slate-900 dark:text-white tracking-tight", children: "إدارة المستخدمين" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-slate-500", children: "التحكم في مستويات الوصول وصلاحيات النظام" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => refetch(), className: "rounded-xl font-bold", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-4 w-4 ml-2" }),
        "تحديث القائمة"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-none shadow-xl bg-white/70 backdrop-blur-xl dark:bg-slate-900/70 rounded-[2rem] overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "border-b border-slate-100 dark:border-slate-800 pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "text-lg font-black flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-5 w-5 text-blue-500" }),
        "قائمة المستخدمين المسجلين"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { className: "bg-slate-50/50 dark:bg-slate-800/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-right font-black", children: "المستخدم" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-right font-black", children: "البريد الإلكتروني" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-right font-black", children: "الدور الحالي" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-right font-black", children: "تغيير الصلاحية" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: allUsers?.map((user) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { className: "hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "font-bold py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-600 dark:text-slate-400", children: user.firstName?.[0] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              user.firstName,
              " ",
              user.lastName
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "font-medium text-slate-500", children: user.email }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Badge,
            {
              variant: user.role === "admin" ? "default" : user.role === "manager" ? "secondary" : "outline",
              className: "font-black rounded-lg px-3",
              children: user.role === "admin" ? "مدير نظام" : user.role === "manager" ? "مدير مشروع" : "مستخدم (قراءة فقط)"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              defaultValue: user.role,
              onValueChange: (value) => updateRoleMutation.mutate({ userId: user.id, role: value }),
              disabled: updateRoleMutation.isPending || user.id === currentUser?.id,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-[200px] h-10 rounded-xl font-bold border-slate-200 dark:border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "اختر الدور" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { className: "rounded-xl border-slate-200 dark:border-slate-800", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "admin", className: "font-bold", children: "مدير نظام" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "manager", className: "font-bold", children: "مدير مشروع" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "user", className: "font-bold", children: "مستخدم (قراءة فقط)" })
                ] })
              ]
            }
          ) })
        ] }, user.id)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "border-none shadow-lg bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-6 w-6" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-black text-blue-600 uppercase tracking-widest", children: "مدير نظام" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-slate-600 dark:text-slate-400", children: "صلاحية كاملة لجميع الأقسام والإعدادات." })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "border-none shadow-lg bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Briefcase, { className: "h-6 w-6" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-black text-purple-600 uppercase tracking-widest", children: "مدير مشروع" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-slate-600 dark:text-slate-400", children: "إدارة العمليات اليومية والمشاريع المخصصة." })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "border-none shadow-lg bg-slate-50/50 dark:bg-slate-800/10 rounded-2xl p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-12 bg-slate-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-600/20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-6 w-6" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-black text-slate-600 uppercase tracking-widest", children: "مستخدم" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-slate-600 dark:text-slate-400", children: 'صلاحية "قراءة فقط" لجميع مكونات التطبيق.' })
        ] })
      ] }) })
    ] })
  ] });
}
export {
  UsersManagementPage as default
};
