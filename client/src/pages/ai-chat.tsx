import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Bot, 
  Copy, 
  Trash2,
  Plus,
  History,
  Settings,
  Menu,
  X,
  Search,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Share2,
  MoreVertical,
  Loader,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  ChevronDown,
  Sparkles,
  Zap,
  Command,
  ArrowUpRight,
  ShieldCheck,
  BrainCircuit,
  PanelLeftClose,
  PanelLeftOpen,
  FileSpreadsheet,
  Activity,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

// Mock ThemeToggle to prevent crash
const ThemeToggle = () => (
  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400">
    <Zap className="h-4 w-4" />
  </Button>
);

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  pending?: boolean;
  error?: string;
  feedback?: "thumbs_up" | "thumbs_down";
  steps?: { title: string; status: 'completed' | 'in_progress' | 'pending'; description?: string }[];
}

interface ChatSession {
  id: string;
  title: string;
  messagesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function AIChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "مرحباً بك في مركز القيادة الذكي. أنا الوكيل المتقدم لمساعدتك في إدارة العمليات والبيانات.\n\nبإمكاني تحليل المشاريع، إنشاء التقارير، وأتمتة المهام الروتينية بدقة عالية. كيف يمكنني دعم أهدافك اليوم؟",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // جلب الجلسات
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
    enabled: !!user,
  });

  // جلب الوصول
  const { data: accessData, isLoading: isAccessLoading, error: accessError } = useQuery({
    queryKey: ["/api/ai/access"],
    queryFn: async () => {
      try {
        console.log("🔄 [AI/Client] Checking access status...");
        const res = await apiRequest("/api/ai/access", "GET");
        console.log("✅ [AI/Client] Access result:", res);
        return res;
      } catch (error: any) {
        console.error("❌ [AI/Client] Access check error:", error);
        // التحقق من حالة المستخدم كحل بديل إذا فشل الطلب
        if (user?.role === 'admin' || user?.role === 'super_admin') {
          return { hasAccess: true };
        }
        throw error;
      }
    },
    retry: 1,
    staleTime: 30000
  });

  const hasAccess = user?.role === 'admin' || user?.role === 'super_admin' || accessData?.hasAccess;

  const createSessionMutation = useMutation({
    mutationFn: async (title: string) => {
      console.log("🚀 [AI/Client] Creating session with title:", title);
      try {
        const res = await apiRequest("/api/ai/sessions", "POST", { title });
        return res;
      } catch (err: any) {
        console.error("❌ [AI/Client] Session creation failed:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log("✅ [AI/Client] Session created:", data.sessionId);
      setCurrentSessionId(data.sessionId);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
      setMessages([
        {
          role: "assistant",
          content: "بدأنا جلسة جديدة. أنا جاهز لمعالجة طلباتك واستخراج البيانات المطلوبة.",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      setIsLoading(true);
      try {
        let activeSessionId = currentSessionId;

        if (!activeSessionId) {
          console.log("🔄 [AI/Client] No active session, creating one...");
          try {
            const sessionRes = await apiRequest("/api/ai/sessions", "POST", { 
              title: message.substring(0, 50) + (message.length > 50 ? "..." : "") 
            });
            
            if (!sessionRes || !sessionRes.sessionId) {
              throw new Error("فشل إنشاء جلسة جديدة - استجابة غير صالحة");
            }
            
            activeSessionId = sessionRes.sessionId;
            setCurrentSessionId(activeSessionId);
            console.log("✅ [AI/Client] New session created:", activeSessionId);
            
            // تحديث قائمة الجلسات في الخلفية
            queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
          } catch (sessionErr: any) {
            console.error("❌ [AI/Client] Failed to create session:", sessionErr);
            throw new Error(`فشل بدء المحادثة: ${sessionErr.message || 'خطأ في المصادقة'}`);
          }
        }

        console.log("📤 [AI/Client] Sending message to session:", activeSessionId);
        const chatRes = await apiRequest("/api/ai/chat", "POST", {
          sessionId: activeSessionId,
          message,
        });
        
        return { ...chatRes, sessionId: activeSessionId };
      } catch (err: any) {
        console.error("❌ [AI/Client] Chat processing error:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "عذراً، لم أتمكن من معالجة الطلب حالياً.",
        timestamp: new Date(),
        steps: data.steps,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error: any) => {
      console.error("AI Chat Error:", error);
      const errorMsg = error.response?.data?.error || error.message || "انقطع الاتصال بالخادم الذكي";
      toast({
        title: "خطأ في المعالجة",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/ai/sessions/${sessionId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
      if (currentSessionId) {
        setCurrentSessionId(null);
        setMessages([
          {
            role: "assistant",
            content: "تم حذف الجلسة بنجاح. كيف يمكنني مساعدتك في جلسة جديدة؟",
            timestamp: new Date(),
          },
        ]);
      }
    },
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      await sendMessageMutation.mutateAsync(input);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        role: "assistant",
        content: "مرحباً بك في مركز القيادة الذكي. أنا الوكيل المتقدم لمساعدتك في إدارة العمليات والبيانات.\n\nبإمكاني تحليل المشاريع، إنشاء التقارير، وأتمتة المهام الروتينية بدقة عالية. كيف يمكنني دعم أهدافك اليوم؟",
        timestamp: new Date(),
      },
    ]);
  };

  const handleSessionClick = async (sessionId: string) => {
    if (currentSessionId === sessionId) return;
    
    setCurrentSessionId(sessionId);
    setMessages([{ 
      role: "assistant", 
      content: "جاري تحميل محادثتك الاستراتيجية...", 
      timestamp: new Date(),
      pending: true 
    }]);

    try {
      const res = await apiRequest(`/api/ai/sessions/${sessionId}/messages`, "GET");
      if (Array.isArray(res)) {
        if (res.length === 0) {
          setMessages([{
            role: "assistant",
            content: "هذه المحادثة فارغة حالياً. كيف يمكنني مساعدتك؟",
            timestamp: new Date(),
          }]);
        } else {
          setMessages(res.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt),
            steps: m.steps
          })));
        }
      }
    } catch (error) {
      console.error("Failed to load session messages:", error);
      toast({
        title: "خطأ في الاتصال",
        description: "تعذر تحميل رسائل الجلسة من قاعدة البيانات",
        variant: "destructive",
      });
      setMessages([{
        role: "assistant",
        content: "عذراً، حدث خطأ أثناء جلب تاريخ المحادثة. يرجى المحاولة مرة أخرى.",
        timestamp: new Date(),
        error: "فشل تحميل البيانات"
      }]);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "تم النسخ",
      description: "النص جاهز في الحافظة",
    });
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [messages]);

  const filteredSessions = sessions.filter((s: any) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isAccessLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-950">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4"
        >
          <BrainCircuit className="h-10 w-10 text-blue-600" />
        </motion.div>
        <p className="text-slate-500 font-medium animate-pulse">جاري تهيئة الوكيل الذكي...</p>
      </div>
    );
  }

  if (!hasAccess && !isAccessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Card className="max-w-md w-full p-8 text-center border-none shadow-2xl bg-white/50 backdrop-blur-xl dark:bg-slate-900/50">
          <ShieldCheck className="h-16 w-16 text-red-500 mx-auto mb-6 opacity-80" />
          <h1 className="text-2xl font-bold mb-3 tracking-tight">منطقة محمية</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">يتطلب الوصول إلى الوكيل الذكي صلاحيات إدارية عليا. يرجى التواصل مع مسؤول النظام.</p>
          <Button 
            className="w-full h-11 bg-slate-900 dark:bg-white dark:text-slate-900 hover-elevate active-elevate-2" 
            onClick={() => setLocation('/')}
          >
            العودة للوحة التحكم
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans" dir="rtl">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col relative z-40 shadow-xl"
          >
            <div className="p-6 flex flex-col gap-6 h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-white tracking-tight">الوكيل الذكي</h2>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Engine</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>

              <Button 
                onClick={startNewChat}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-500/25 border-none transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                محادثة استراتيجية
              </Button>

              <div className="relative group">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="البحث في الأرشيف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 h-10 bg-slate-50 dark:bg-slate-800 border-none focus-visible:ring-1 focus-visible:ring-blue-500 transition-all rounded-lg"
                />
              </div>

              <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-1 pb-4">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs text-slate-400">لا توجد محادثات سابقة</p>
              </div>
            ) : filteredSessions.map((session: any) => (
              <div
                key={session.id}
                onClick={() => handleSessionClick(session.id)}
                className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                  currentSessionId === session.id
                    ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-800"
                    : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    currentSessionId === session.id ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                  }`}>
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${currentSessionId === session.id ? "text-blue-900 dark:text-blue-100" : "text-slate-700 dark:text-slate-300"}`}>
                      {session.title}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{session.messagesCount} تفاعل</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSessionMutation.mutate(session.id);
                    }}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
              </ScrollArea>

              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  <span className="text-sm font-bold text-slate-600">{user?.email?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.email?.split('@')[0]}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">{user?.role}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-400">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-950 min-w-0">
      {/* Top Header */}
      <div className="sticky top-0 z-[100] w-full p-4 bg-transparent pointer-events-none">
        <header className="h-16 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 px-6 flex items-center justify-between bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl shadow-2xl shadow-slate-200/20 dark:shadow-none pointer-events-auto max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <PanelLeftOpen className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Enterprise AI v2.5
              </Badge>
              <Separator orientation="vertical" className="h-4 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-1 text-slate-400 text-xs">
                <Zap className="h-3 w-3 fill-current text-yellow-500" />
                <span>Turbo Performance</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={startNewChat}
              disabled={createSessionMutation.isPending}
              className="h-9 rounded-lg border-slate-200 dark:border-slate-800 text-xs gap-2 hover-elevate hidden sm:flex"
            >
              <Plus className="h-3.5 w-3.5" />
              محادثة جديدة
            </Button>
            <ThemeToggle />
          </div>
        </header>
      </div>

        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto py-24 space-y-8 pb-40">
            {messages.length <= 1 && !currentSessionId && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">مركز العمليات الذكي</h2>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed">مرحباً بك في وحدة التحكم المتقدمة. اختر أحد الاختصارات أدناه أو ابدأ محادثة جديدة للتحليل المعمق.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 max-w-2xl mx-auto">
                  {[
                    { title: "ملخص المشاريع الرقمي", icon: FileSpreadsheet, prompt: "أعطني ملخصاً لحالة كافة المشاريع النشطة", color: "text-blue-600" },
                    { title: "تحليل المصاريف والتدفقات", icon: Zap, prompt: "حلل مصاريف الأسبوع الماضي وقارنها بالميزانية", color: "text-yellow-500" },
                    { title: "كشوفات المستحقات والعمال", icon: MessageSquare, prompt: "استخرج كشف حساب للعاملين في مشروع محدد", color: "text-green-600" },
                    { title: "التدقيق الأمني والمالي", icon: ShieldCheck, prompt: "هل هناك أي تضارب في القيود المالية الأخيرة؟", color: "text-red-500" }
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(item.prompt)}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl hover:shadow-blue-500/5 text-right transition-all group flex items-start gap-4"
                    >
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-600 transition-colors shadow-sm">
                        <item.icon className={`h-6 w-6 ${item.color} group-hover:text-white transition-colors`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-bold text-slate-900 dark:text-white mb-1">{item.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{item.prompt}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center shadow-sm ${
                    msg.role === "user" 
                      ? "bg-blue-700 text-white" 
                      : "bg-blue-600 text-white"
                  }`}>
                    {msg.role === "user" ? <Command className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </div>

                  <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    {msg.role === "assistant" && msg.steps && msg.steps.length > 0 && (
                      <div className="w-full mb-2 space-y-2">
                        {msg.steps.map((step, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                            {step.status === 'completed' ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : step.status === 'in_progress' ? (
                              <Loader className="h-3 w-3 text-blue-500 animate-spin" />
                            ) : (
                              <Clock className="h-3 w-3 text-slate-300" />
                            )}
                            <span className="font-medium">{step.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={`rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white font-medium shadow-blue-500/10"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                    }`}>
                      {msg.role === "assistant" && (
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-600 opacity-80" />
                      )}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap selection:bg-blue-100 selection:text-blue-900">
                        {msg.content}
                      </div>
                      
                      {msg.error && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30 flex items-start gap-3">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium">{msg.error}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 px-1">
                      <span className="text-[10px] text-slate-400 font-medium tabular-nums">
                        {msg.timestamp.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      
                      {msg.role === "assistant" && !msg.error && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => copyMessage(msg.content)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-green-600">
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600">
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600">
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="flex gap-4"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
                    <div className="flex gap-1">
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    </div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest animate-pulse">Processing...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Quick Actions Bar */}
        <div className="absolute bottom-[110px] left-0 right-0 px-6 z-[90]">
          <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
            {[
              { label: "تصدير كشف عامل", icon: FileSpreadsheet, prompt: "أريد تصدير كشف حساب اكسل للعامل: " },
              { label: "تقرير المصروفات", icon: Activity, prompt: "استخرج تقرير مصروفات شامل لمشروع: " },
              { label: "فحص الأخطاء", icon: AlertTriangle, prompt: "هل توجد أخطاء في بيانات مشروع: " },
              { label: "ملخص يومي", icon: Clock, prompt: "أعطني ملخص العمليات لليوم" }
            ].map((item, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => setInput(item.prompt)}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-800 text-[10px] h-8 rounded-full gap-2 whitespace-nowrap hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 transition-all shadow-sm shrink-0"
              >
                <item.icon className="h-3 w-3 text-blue-500" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Action Bar */}
        <div className="sticky bottom-0 left-0 right-0 p-6 bg-transparent z-[100]">
          <div className="max-w-4xl mx-auto">
            <div className="relative group bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-300/50 dark:border-slate-700/50 rounded-2xl shadow-2xl transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="اسأل أي شيء... (Shift+Enter لسطر جديد)"
                className="w-full bg-transparent border-none text-slate-800 dark:text-slate-100 placeholder:text-slate-500 p-5 pr-14 pl-20 min-h-[60px] max-h-[200px] resize-none focus:ring-0 text-base leading-relaxed transition-all"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              
              <div className="absolute right-4 top-4">
                <div className="w-6 h-6 rounded-md bg-slate-100/50 dark:bg-slate-800/50 flex items-center justify-center">
                  <ArrowUpRight className="h-3 w-3 text-slate-400" />
                </div>
              </div>

              <div className="absolute left-3 bottom-3 flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-slate-400 hover:text-blue-600 rounded-xl"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-4 mx-1" />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className={`h-10 w-10 rounded-xl transition-all shadow-lg ${
                    input.trim() 
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30 scale-105" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}
                >
                  {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
