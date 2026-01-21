import { am as createLucideIcon, aN as useAuth, a as useToast, u as useLocation, r as reactExports, f as useQuery, g as useMutation, j as jsxRuntimeExports, be as motion, l as Card, b4 as ShieldCheck, B as Button, bd as AnimatePresence, P as Plus, bH as Search, I as Input, bI as ScrollArea, aC as History, b2 as MessageSquare, q as Trash2, ai as Badge, ag as Settings, bJ as FileSpreadsheet, b3 as Zap, bK as ArrowUpRight, H as format, bL as Loader, bM as CircleCheckBig, aa as Clock, bN as Copy, bG as queryClient, V as apiRequest } from "./index-BD1Qzn1x.js";
import { S as Sparkles } from "./sparkles.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ArrowUp = createLucideIcon("ArrowUp", [
  ["path", { d: "m5 12 7-7 7 7", key: "hav0vg" }],
  ["path", { d: "M12 19V5", key: "x0mq9r" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Bot = createLucideIcon("Bot", [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const BrainCircuit = createLucideIcon("BrainCircuit", [
  [
    "path",
    {
      d: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",
      key: "l5xja"
    }
  ],
  ["path", { d: "M9 13a4.5 4.5 0 0 0 3-4", key: "10igwf" }],
  ["path", { d: "M6.003 5.125A3 3 0 0 0 6.401 6.5", key: "105sqy" }],
  ["path", { d: "M3.477 10.896a4 4 0 0 1 .585-.396", key: "ql3yin" }],
  ["path", { d: "M6 18a4 4 0 0 1-1.967-.516", key: "2e4loj" }],
  ["path", { d: "M12 13h4", key: "1ku699" }],
  ["path", { d: "M12 18h6a2 2 0 0 1 2 2v1", key: "105ag5" }],
  ["path", { d: "M12 8h8", key: "1lhi5i" }],
  ["path", { d: "M16 8V5a2 2 0 0 1 2-2", key: "u6izg6" }],
  ["circle", { cx: "16", cy: "13", r: ".5", key: "ry7gng" }],
  ["circle", { cx: "18", cy: "3", r: ".5", key: "1aiba7" }],
  ["circle", { cx: "20", cy: "21", r: ".5", key: "yhc1fs" }],
  ["circle", { cx: "20", cy: "8", r: ".5", key: "1e43v0" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const PanelLeftClose = createLucideIcon("PanelLeftClose", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "M9 3v18", key: "fh3hqa" }],
  ["path", { d: "m16 15-3-3 3-3", key: "14y99z" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const PanelLeftOpen = createLucideIcon("PanelLeftOpen", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "M9 3v18", key: "fh3hqa" }],
  ["path", { d: "m14 9 3 3-3 3", key: "8010ee" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ThumbsUp = createLucideIcon("ThumbsUp", [
  ["path", { d: "M7 10v12", key: "1qc93n" }],
  [
    "path",
    {
      d: "M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z",
      key: "emmmcr"
    }
  ]
]);
const ThemeToggle = () => /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", className: "h-9 w-9 text-slate-400 no-default-hover-elevate no-default-active-elevate", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "h-4 w-4" }) });
function AIChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = reactExports.useState(false);
  const [currentSessionId, setCurrentSessionId] = reactExports.useState(null);
  const [messages, setMessages] = reactExports.useState([
    {
      role: "assistant",
      content: "مرحباً بك في مركز قيادة AgentForge. لقد تم تفعيل الوكيل الجديد مع كافة الصلاحيات للوصول إلى أدوات المشروع وتحليل البيانات الاستراتيجية.\n\nكيف يمكنني مساعدتك اليوم باستخدام قدرات AF المتقدمة؟",
      timestamp: /* @__PURE__ */ new Date()
    }
  ]);
  const [input, setInput] = reactExports.useState("");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [attachments, setAttachments] = reactExports.useState([]);
  const [attachmentPreviews, setAttachmentPreviews] = reactExports.useState([]);
  const [showHeader, setShowHeader] = reactExports.useState(true);
  const lastScrollY = reactExports.useRef(0);
  const scrollAreaRef = reactExports.useRef(null);
  const textareaRef = reactExports.useRef(null);
  const fileInputRef = reactExports.useRef(null);
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setAttachments((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };
  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentPreviews((prev) => prev.filter((_, i) => i !== index));
  };
  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/ai/sessions"],
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/ai/sessions", "GET");
        return Array.isArray(res) ? res : [];
      } catch (error) {
        console.error("خطأ في جلب الجلسات:", error);
        return [];
      }
    },
    enabled: !!user
  });
  const { data: accessData, isLoading: isAccessLoading } = useQuery({
    queryKey: ["/api/ai/access"],
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/ai/access", "GET");
        return res;
      } catch (error) {
        if (user?.role === "admin" || user?.role === "super_admin") {
          return { hasAccess: true };
        }
        throw error;
      }
    },
    retry: 1,
    staleTime: 3e4
  });
  const hasAccess = user?.role === "admin" || user?.role === "super_admin" || accessData?.hasAccess;
  useMutation({
    mutationFn: async (title) => {
      const res = await apiRequest("/api/ai/sessions", "POST", { title });
      return res;
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
      setMessages([
        {
          role: "assistant",
          content: "بدأنا جلسة جديدة. أنا جاهز لمعالجة طلباتك واستخراج البيانات المطلوبة.",
          timestamp: /* @__PURE__ */ new Date()
        }
      ]);
    }
  });
  const sendMessageMutation = useMutation({
    mutationFn: async (message) => {
      setIsLoading(true);
      try {
        let activeSessionId = currentSessionId;
        if (!activeSessionId) {
          const sessionRes = await apiRequest("/api/ai/sessions", "POST", {
            title: message.substring(0, 50) + (message.length > 50 ? "..." : "")
          });
          activeSessionId = sessionRes.sessionId;
          setCurrentSessionId(activeSessionId);
          queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
        }
        const chatRes = await apiRequest("/api/ai/chat", "POST", {
          sessionId: activeSessionId,
          message
        });
        return { ...chatRes, sessionId: activeSessionId };
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
      const assistantMessage = {
        role: "assistant",
        content: data.message || "عذراً، لم أتمكن من معالجة الطلب حالياً.",
        timestamp: /* @__PURE__ */ new Date(),
        steps: data.steps
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || error.message || "انقطع الاتصال بالخادم الذكي";
      toast({
        title: "خطأ في المعالجة",
        description: errorMsg,
        variant: "destructive"
      });
    }
  });
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId) => {
      return await apiRequest(`/api/ai/sessions/${sessionId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
      if (currentSessionId) {
        setCurrentSessionId(null);
        startNewChat();
      }
    }
  });
  reactExports.useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (!scrollContainer) return;
    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      lastScrollY.current = currentScrollY;
    };
    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);
  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0 || isLoading) return;
    const userMessage = {
      role: "user",
      content: input,
      timestamp: /* @__PURE__ */ new Date()
    };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setAttachments([]);
    setAttachmentPreviews([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    try {
      await sendMessageMutation.mutateAsync(currentInput);
    } catch (err) {
    }
  };
  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        role: "assistant",
        content: "مرحباً بك في مركز القيادة الذكي. أنا الوكيل المتقدم لمساعدتك في إدارة العمليات والبيانات.\n\nبإمكاني تحليل المشاريع، إنشاء التقارير، وأتمتة المهام الروتينية بدقة عالية. كيف يمكنني دعم أهدافك اليوم؟",
        timestamp: /* @__PURE__ */ new Date()
      }
    ]);
  };
  const handleSessionClick = async (sessionId) => {
    if (currentSessionId === sessionId) {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      return;
    }
    setCurrentSessionId(sessionId);
    if (window.innerWidth < 1024) setSidebarOpen(false);
    setMessages([{
      role: "assistant",
      content: "جاري تحميل محادثتك الاستراتيجية...",
      timestamp: /* @__PURE__ */ new Date(),
      pending: true
    }]);
    try {
      const res = await apiRequest(`/api/ai/sessions/${sessionId}/messages`, "GET");
      if (Array.isArray(res)) {
        if (res.length === 0) {
          setMessages([{
            role: "assistant",
            content: "هذه المحادثة فارغة حالياً. كيف يمكنني مساعدتك؟",
            timestamp: /* @__PURE__ */ new Date()
          }]);
        } else {
          setMessages(res.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt),
            steps: m.steps
          })));
        }
      }
    } catch (error) {
      toast({
        title: "خطأ في الاتصال",
        description: "تعذر تحميل رسائل الجلسة من قاعدة البيانات",
        variant: "destructive"
      });
    }
  };
  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "تم النسخ",
      description: "النص جاهز في الحافظة"
    });
  };
  reactExports.useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [messages]);
  reactExports.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);
  const filteredSessions = sessions.filter(
    (s) => s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  if (isAccessLoading && !user) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-950", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        motion.div,
        {
          animate: { scale: [1, 1.1, 1] },
          transition: { repeat: Infinity, duration: 2 },
          className: "p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(BrainCircuit, { className: "h-10 w-10 text-blue-600" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500 font-medium animate-pulse", children: "جاري تهيئة الوكيل الذكي..." })
    ] });
  }
  if (!hasAccess && !isAccessLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        className: "max-w-md w-full",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-8 text-center border-none shadow-2xl bg-white/70 backdrop-blur-2xl dark:bg-slate-900/70 rounded-[2.5rem] overflow-hidden relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-20 h-20 bg-blue-600/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-10 w-10 text-blue-600" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-black mb-4 tracking-tight text-slate-900 dark:text-white", children: "منطقة استراتيجية" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium", children: 'الوصول إلى الوكيل الذكي يتطلب مستوى صلاحيات "مسؤول نظام" لتفعيل قدرات التحليل المتقدمة.' }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  className: "w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] no-default-hover-elevate no-default-active-elevate",
                  onClick: () => setLocation("/"),
                  children: "العودة للوحة التحكم"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 font-medium", children: "تواصل مع الإدارة لطلب الترقية" })
            ] })
          ] })
        ] })
      }
    ) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-screen bg-white dark:bg-slate-950 overflow-hidden font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30", dir: "rtl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: sidebarOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        motion.div,
        {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          onClick: () => setSidebarOpen(false),
          className: "fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-[140]"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        motion.div,
        {
          initial: { width: 0, opacity: 0, x: 20 },
          animate: { width: 260, opacity: 1, x: 0 },
          exit: { width: 0, opacity: 0, x: 20 },
          transition: { type: "spring", damping: 25, stiffness: 200 },
          className: "h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-l border-slate-200/60 dark:border-slate-800/60 flex flex-col fixed inset-y-0 right-0 z-[150] shadow-2xl",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 flex flex-col gap-6 h-full", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-5 w-5 text-white group-hover:scale-110 transition-transform" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-black text-slate-900 dark:text-white tracking-tight", children: "AgentForge Commander" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase font-black text-slate-400 tracking-widest", children: "Powered by AF-Core" })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => setSidebarOpen(false), className: "rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PanelLeftClose, { className: "h-4 w-4" }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                onClick: startNewChat,
                className: "w-full h-12 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white gap-3 shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98] font-bold rounded-xl no-default-hover-elevate no-default-active-elevate",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4 text-blue-600" }),
                  "محادثة استراتيجية"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  placeholder: "البحث في الأرشيف...",
                  value: searchQuery,
                  onChange: (e) => setSearchQuery(e.target.value),
                  className: "pr-10 h-11 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all rounded-xl text-sm font-medium"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollArea, { className: "flex-1 -mx-2 px-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5 pb-4", children: filteredSessions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-12 px-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "h-5 w-5 text-slate-300" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold text-slate-400", children: "لا توجد سجلات حالية" })
            ] }) : filteredSessions.map((session) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              motion.div,
              {
                initial: { opacity: 0, x: 5 },
                animate: { opacity: 1, x: 0 },
                onClick: () => handleSessionClick(session.id),
                className: `group relative p-3.5 rounded-2xl cursor-pointer transition-all border ${currentSessionId === session.id ? "bg-white dark:bg-slate-800 border-blue-100 dark:border-blue-900/50 shadow-sm" : "border-transparent hover:bg-white/40 dark:hover:bg-slate-800/40"}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-9 h-9 rounded-xl flex items-center justify-center transition-all ${currentSessionId === session.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { className: "h-4 w-4" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `text-sm font-bold truncate ${currentSessionId === session.id ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`, children: session.title }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mt-0.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] font-black text-slate-400 uppercase tracking-tighter", children: [
                        session.messagesCount,
                        " تفاعل"
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-1 h-1 bg-slate-300 rounded-full" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-medium text-slate-400 italic", children: "نشط" })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      variant: "ghost",
                      size: "icon",
                      onClick: (e) => {
                        e.stopPropagation();
                        deleteSessionMutation.mutate(session.id);
                      },
                      className: "h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg no-default-hover-elevate no-default-active-elevate",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" })
                    }
                  )
                ] })
              },
              session.id
            )) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-auto pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center overflow-hidden border border-white dark:border-slate-600 shadow-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-black text-slate-700 dark:text-slate-300 uppercase", children: user?.email?.[0] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-black text-slate-900 dark:text-white truncate tracking-tight", children: user?.email?.split("@")[0] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-[9px] font-black uppercase py-0 px-1.5 border-blue-200 text-blue-600 bg-blue-50/50", children: user?.role === "admin" ? "Chief Architect" : user?.role })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", className: "text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl no-default-hover-elevate no-default-active-elevate", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "h-4 w-4" }) })
            ] })
          ] })
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col relative bg-white dark:bg-slate-950 min-w-0 h-full overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: showHeader && /* @__PURE__ */ jsxRuntimeExports.jsx(
        motion.div,
        {
          initial: { y: -100, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: -100, opacity: 0 },
          className: "absolute top-0 left-0 right-0 z-[100] p-4 pointer-events-none",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-5xl mx-auto flex items-center justify-between pointer-events-auto", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              !sidebarOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  size: "icon",
                  onClick: () => setSidebarOpen(true),
                  className: "h-10 w-10 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all no-default-hover-elevate no-default-active-elevate",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(PanelLeftOpen, { className: "h-4 w-4 text-slate-600" })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-3 h-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3.5 w-3.5 text-blue-600 animate-pulse" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest", children: "Neural Pro" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  onClick: startNewChat,
                  className: "h-10 px-4 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200 dark:border-slate-800 text-[10px] font-bold gap-2 no-default-hover-elevate no-default-active-elevate hidden sm:flex shadow-sm",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5 text-blue-600" }),
                    "مهمة جديدة"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-10 w-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {}) })
            ] })
          ] })
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollArea, { ref: scrollAreaRef, className: "flex-1 px-4 sm:px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl mx-auto py-24 space-y-10 pb-40", children: [
        messages.length <= 1 && !currentSessionId && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          motion.div,
          {
            initial: { opacity: 0, y: 30 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.6, ease: "easeOut" },
            className: "text-center py-16",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative inline-block mb-10", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-blue-600/20 blur-[60px] rounded-full scale-150 animate-pulse" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/40 transform -rotate-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-12 w-12 text-white" }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter leading-tight", children: [
                "كيف يمكنني قيادة ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-blue-600", children: "بياناتك اليوم؟" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed font-medium text-lg mb-16", children: "أنا وحدة الذكاء الاصطناعي المتقدمة، مصمم لتحليل أداء مشاريعك واستخراج رؤى استراتيجية من بياناتك بدقة متناهية." }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto", children: [
                { title: "التقرير التنفيذي الشامل", desc: "ملخص ذكي لكافة العمليات الجارية", icon: FileSpreadsheet, prompt: "أريد تقريراً تنفيذياً شاملاً عن حالة كافة المشاريع النشطة اليوم", color: "blue" },
                { title: "تحليل كفاءة الإنفاق", desc: "رصد الانحرافات المالية والتدفقات", icon: Zap, prompt: "حلل نمط الإنفاق في آخر 30 يوماً وقارنه بالميزانيات التقديرية", color: "amber" },
                { title: "جرد المستحقات العمالية", desc: "كشوفات دقيقة للعمال والمهام", icon: MessageSquare, prompt: "استخرج لي قائمة بالمستحقات المتبقية للعمال في المشاريع النشطة", color: "emerald" },
                { title: "التدقيق المالي الاستباقي", desc: "كشف الثغرات والأخطاء المحتملة", icon: ShieldCheck, prompt: "هل تكتشف أي تضارب أو عمليات غير منطقية في السجلات المالية الأخيرة؟", color: "rose" }
              ].map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                motion.button,
                {
                  whileHover: { y: -5, scale: 1.02 },
                  whileTap: { scale: 0.98 },
                  onClick: () => setInput(item.prompt),
                  className: "p-6 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-2xl hover:shadow-blue-500/10 text-right transition-all group flex items-start gap-5 relative overflow-hidden",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(item.icon, { className: "h-6 w-6" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 pt-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-black text-slate-900 dark:text-white mb-1 tracking-tight", children: item.title }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 font-bold uppercase tracking-widest leading-none", children: item.desc })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { className: "h-4 w-4 text-slate-300" }) })
                  ]
                },
                i
              )) })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-10", children: [
          messages.map((message, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            motion.div,
            {
              initial: { opacity: 0, y: 15 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: index * 0.05 },
              className: `flex ${message.role === "user" ? "justify-end" : "justify-start"}`,
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex gap-3 max-w-[90%] sm:max-w-[85%] ${message.role === "user" ? "flex-row" : "flex-row-reverse"}`, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex-1 flex flex-col gap-1.5 ${message.role === "user" ? "items-end" : "items-start"}`, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex items-center gap-2 px-1 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-tighter", children: message.role === "user" ? "You" : "Neural Agent" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-300 dark:text-slate-600", children: format(message.timestamp, "h:mm a") })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex flex-col gap-2 w-full ${message.role === "user" ? "items-end" : "items-start"}`, children: [
                    message.role === "assistant" && message.pending && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Loader, { className: "h-3.5 w-3.5 text-blue-500 animate-spin" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold text-blue-600 animate-pulse", children: "Working..." })
                    ] }),
                    message.steps && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full max-w-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden rounded-2xl", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "group", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "flex items-center justify-between p-3 cursor-pointer list-none hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "h-3.5 w-3.5 text-emerald-500" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-bold text-slate-600 dark:text-slate-400", children: [
                            message.steps.length,
                            " Completed tasks"
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] font-mono text-slate-400", children: [
                            message.steps.filter((s) => s.status === "completed").length,
                            "/",
                            message.steps.length
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "h-3 w-3 text-slate-400 group-open:rotate-180 transition-transform" })
                        ] })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 pt-0 space-y-2 border-t border-slate-200/40 dark:border-slate-800/40", children: message.steps.map((step, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                        step.status === "completed" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "h-3 w-3 text-emerald-500" }) : step.status === "in_progress" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Loader, { className: "h-3 w-3 text-blue-500 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-3 w-3 text-slate-300" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-medium text-slate-500", children: step.title })
                      ] }, i)) })
                    ] }) }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-sm leading-relaxed whitespace-pre-wrap font-medium break-words max-w-full ${message.role === "user" ? "text-slate-700 dark:text-slate-200" : "text-slate-800 dark:text-slate-100"}`, children: message.content })
                  ] }),
                  message.role === "assistant" && !message.pending && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => copyMessage(message.content), className: "h-7 w-7 text-slate-300 hover:text-blue-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-3.5 w-3.5" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-slate-300 hover:text-blue-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ThumbsUp, { className: "h-3.5 w-3.5" }) })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0 pt-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-8 h-8 rounded-lg flex items-center justify-center ${message.role === "user" ? "bg-slate-100 dark:bg-slate-800 text-slate-500" : "bg-blue-600/10 text-blue-600"}`, children: message.role === "user" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-black uppercase", children: user?.email?.[0] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { className: "h-4 w-4" }) }) })
              ] })
            },
            index
          )),
          isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(
            motion.div,
            {
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
              className: "flex justify-start",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-5 max-w-[75%]", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center animate-pulse", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { className: "h-5 w-5" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-50 dark:bg-slate-900 p-6 rounded-[2.5rem] rounded-tl-none shadow-sm border border-slate-200/50 dark:border-slate-800/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { animate: { scale: [1, 1.2, 1] }, transition: { repeat: Infinity, duration: 1 }, className: "w-1.5 h-1.5 bg-blue-600 rounded-full" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { animate: { scale: [1, 1.2, 1] }, transition: { repeat: Infinity, duration: 1, delay: 0.2 }, className: "w-1.5 h-1.5 bg-blue-600 rounded-full" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { animate: { scale: [1, 1.2, 1] }, transition: { repeat: Infinity, duration: 1, delay: 0.4 }, className: "w-1.5 h-1.5 bg-blue-600 rounded-full" })
                ] }) }) })
              ] })
            }
          )
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-6 left-0 right-0 p-4 z-[120] pointer-events-none", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-3xl mx-auto relative group pointer-events-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-blue-600/5 blur-2xl rounded-[1.5rem] group-focus-within:bg-blue-600/10 transition-all" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 p-2 rounded-[1.5rem] shadow-none", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: attachmentPreviews.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            motion.div,
            {
              initial: { height: 0, opacity: 0 },
              animate: { height: "auto", opacity: 1 },
              exit: { height: 0, opacity: 0 },
              className: "flex flex-wrap gap-2 px-3 pt-2 overflow-hidden",
              children: attachmentPreviews.map((preview, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative group/img", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: preview, alt: "Attachment", className: "w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: () => removeAttachment(i),
                    className: "absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" })
                  }
                )
              ] }, i))
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "textarea",
            {
              ref: textareaRef,
              placeholder: "كيف يمكنني مساعدتك في إدارة مشاريعك اليوم؟",
              value: input,
              onChange: (e) => setInput(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter" && e.shiftKey) ;
              },
              rows: 1,
              className: "w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 py-3 px-3 text-sm font-medium resize-none min-h-[44px] max-h-48 shadow-none"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-2 pb-1 mt-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "file",
                  ref: fileInputRef,
                  className: "hidden",
                  accept: "image/*",
                  multiple: true,
                  onChange: handleFileSelect
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "ghost",
                  size: "icon",
                  onClick: () => fileInputRef.current?.click(),
                  className: "h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 no-default-hover-elevate no-default-active-elevate",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", className: "h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 no-default-hover-elevate no-default-active-elevate", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { className: "h-4 w-4" }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: (input.trim() || attachments.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsx(
                motion.div,
                {
                  initial: { scale: 0.8, opacity: 0 },
                  animate: { scale: 1, opacity: 1 },
                  exit: { scale: 0.8, opacity: 0 },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      onClick: handleSend,
                      disabled: isLoading,
                      size: "icon",
                      className: "h-9 w-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95 no-default-hover-elevate no-default-active-elevate",
                      children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Loader, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "h-4 w-4" })
                    }
                  )
                }
              ) }),
              !input.trim() && attachments.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-9 w-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "h-4 w-4" }) })
            ] })
          ] })
        ] }) })
      ] }) })
    ] })
  ] });
}
export {
  AIChatPage as default
};
