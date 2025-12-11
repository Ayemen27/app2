import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, Send, Plus, Trash2, MessageSquare, Loader2, 
  Brain, Search, Database, FileText, ChevronDown, ChevronRight,
  Users, Building2, Calculator, ClipboardList, Sparkles,
  CheckCircle, AlertCircle, Clock, Menu, X, Settings,
  Zap, MoreHorizontal
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  provider?: string;
  action?: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string;
  messagesCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

interface ThinkingStep {
  id: string;
  type: "thinking" | "searching" | "executing" | "responding" | "analyzing";
  message: string;
  status: "active" | "done";
  details?: string;
}

const quickCommands = [
  { icon: Users, label: "عرض العمال", command: "أعطني قائمة بجميع العمال" },
  { icon: Building2, label: "عرض المشاريع", command: "أعطني قائمة بجميع المشاريع" },
  { icon: Calculator, label: "مصروفات اليوم", command: "ما هي مصروفات اليوم؟" },
  { icon: ClipboardList, label: "تصفية حساب", command: "أنشئ تصفية حساب للعامل " },
  { icon: FileText, label: "تقرير مشروع", command: "أعطني ملخص مصروفات المشروع " },
  { icon: Search, label: "بحث عن عامل", command: "ابحث عن العامل " },
];

export default function AIChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: accessData } = useQuery({
    queryKey: ["/api/ai/access"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/ai/access", { 
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return res.json();
    },
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<ChatSession[]>({
    queryKey: ["/api/ai/sessions"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/ai/sessions", { 
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: accessData?.hasAccess,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/ai/sessions", currentSessionId, "messages"],
    queryFn: async () => {
      if (!currentSessionId) return [];
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/ai/sessions/${currentSessionId}/messages`, { 
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentSessionId && accessData?.hasAccess,
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/ai/sessions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: "include",
        body: JSON.stringify({ title: "محادثة جديدة" }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
      setSidebarOpen(false);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const token = localStorage.getItem("accessToken");
      await fetch(`/api/ai/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    },
    onSuccess: () => {
      setCurrentSessionId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (msg: string) => {
      setIsThinking(true);
      const stepId1 = crypto.randomUUID();
      setThinkingSteps([
        { id: stepId1, type: "thinking", message: "جاري التفكير في طلبك...", status: "active" },
      ]);
      setExpandedSteps({ [stepId1]: true });

      await new Promise(r => setTimeout(r, 600));
      const stepId2 = crypto.randomUUID();
      setThinkingSteps(prev => [
        { ...prev[0], status: "done", details: "تم فهم الطلب" },
        { id: stepId2, type: "searching", message: "جاري البحث في قاعدة البيانات...", status: "active" },
      ]);

      await new Promise(r => setTimeout(r, 500));
      const stepId3 = crypto.randomUUID();
      setThinkingSteps(prev => [
        prev[0],
        { ...prev[1], status: "done", details: "تم العثور على البيانات" },
        { id: stepId3, type: "executing", message: "جاري معالجة البيانات...", status: "active" },
      ]);

      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: "include",
        body: JSON.stringify({ sessionId: currentSessionId, message: msg }),
      });

      const data = await res.json();
      const stepId4 = crypto.randomUUID();

      setThinkingSteps(prev => [
        prev[0],
        prev[1],
        { ...prev[2], status: "done", details: "تمت المعالجة بنجاح" },
        { id: stepId4, type: "responding", message: "تم الانتهاء", status: "done" },
      ]);

      await new Promise(r => setTimeout(r, 400));
      setIsThinking(false);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions", currentSessionId, "messages"] });
      setMessage("");
      setTimeout(() => setThinkingSteps([]), 3000);
    },
    onError: (error: any) => {
      setIsThinking(false);
      const errorStep = crypto.randomUUID();
      setThinkingSteps(prev => [
        ...prev.map(s => ({ ...s, status: "done" as const })),
        { id: errorStep, type: "responding" as const, message: `خطأ: ${error.message || "فشل في الاتصال"}`, status: "done" as const }
      ]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinkingSteps]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [message]);

  const handleSend = () => {
    if (!message.trim() || !currentSessionId || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message);
  };

  const handleQuickCommand = (cmd: string) => {
    setMessage(cmd);
    textareaRef.current?.focus();
  };

  const toggleStepExpand = (stepId: string) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const getStepIcon = (type: string, status: string) => {
    if (status === "active") return <Loader2 className="h-4 w-4 animate-spin text-purple-500" />;
    if (status === "done") return <CheckCircle className="h-4 w-4 text-green-500" />;
    
    switch (type) {
      case "thinking": return <Brain className="h-4 w-4 text-purple-500" />;
      case "searching": return <Search className="h-4 w-4 text-blue-500" />;
      case "executing": return <Database className="h-4 w-4 text-amber-500" />;
      case "analyzing": return <Zap className="h-4 w-4 text-cyan-500" />;
      case "responding": return <FileText className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  };

  if (!accessData?.hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center p-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-md">
          <AlertCircle className="h-16 w-16 mx-auto text-yellow-400 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">غير مصرح</h2>
          <p className="text-white/70">
            {accessData?.reason || "هذه الميزة متاحة فقط للمسؤولين"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside className={`
        fixed md:relative inset-y-0 right-0 z-50 w-72 
        bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        flex flex-col
      `}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-slate-800 dark:text-white">المحادثات</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-3">
          <Button
            className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            onClick={() => createSessionMutation.mutate()}
            disabled={createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            محادثة جديدة
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2">
          {sessionsLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center p-8 text-slate-500 dark:text-slate-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">لا توجد محادثات بعد</p>
            </div>
          ) : (
            <div className="space-y-1 py-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`
                    group flex items-center gap-3 p-3 rounded-xl cursor-pointer
                    transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700
                    ${currentSessionId === session.id 
                      ? "bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700" 
                      : "border border-transparent"}
                  `}
                  onClick={() => {
                    setCurrentSessionId(session.id);
                    setSidebarOpen(false);
                  }}
                >
                  <MessageSquare className={`h-4 w-4 flex-shrink-0 ${
                    currentSessionId === session.id ? "text-purple-600" : "text-slate-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">
                      {session.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {session.messagesCount} رسالة
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSessionMutation.mutate(session.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-slate-800 dark:text-white text-sm">الوكيل الذكي</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">مساعدك في إدارة المشاريع</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium">
              متصل
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto px-4 py-6">
              {!currentSessionId ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/25">
                    <Bot className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">مرحباً بك!</h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md">
                    أنا الوكيل الذكي، يمكنني مساعدتك في إدارة المشاريع والعمال والمصروفات وإنشاء التقارير
                  </p>
                  <Button
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25"
                    onClick={() => createSessionMutation.mutate()}
                  >
                    <Plus className="h-5 w-5" />
                    بدء محادثة جديدة
                  </Button>
                  
                  <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-3 max-w-xl">
                    {quickCommands.map((cmd, i) => (
                      <button
                        key={i}
                        className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all text-sm text-slate-600 dark:text-slate-300"
                        onClick={() => {
                          createSessionMutation.mutate();
                          setTimeout(() => handleQuickCommand(cmd.command), 500);
                        }}
                      >
                        <cmd.icon className="h-4 w-4 text-purple-500" />
                        {cmd.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : messagesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      {msg.role === "user" ? (
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">أ</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-slate-800 dark:text-white">أنت</span>
                              <span className="text-xs text-slate-400">{formatTime(msg.createdAt)}</span>
                            </div>
                            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 inline-block max-w-[85%]">
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-slate-800 dark:text-white">الوكيل الذكي</span>
                              <span className="text-xs text-slate-400">{formatTime(msg.createdAt)}</span>
                              {msg.provider && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
                                  {msg.provider}
                                </span>
                              )}
                            </div>
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm">
                              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                {msg.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {thinkingSteps.length > 0 && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm">
                          {thinkingSteps.map((step, index) => (
                            <div key={step.id} className="mb-2 last:mb-0">
                              <button
                                className="flex items-center gap-2 w-full text-right hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg p-1.5 -mx-1.5 transition-colors"
                                onClick={() => toggleStepExpand(step.id)}
                              >
                                {getStepIcon(step.type, step.status)}
                                <span className={`flex-1 text-sm ${
                                  step.status === "active" 
                                    ? "text-slate-800 dark:text-white font-medium" 
                                    : "text-slate-500 dark:text-slate-400"
                                }`}>
                                  {step.message}
                                </span>
                                {step.details && (
                                  <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${
                                    expandedSteps[step.id] ? "rotate-90" : ""
                                  }`} />
                                )}
                              </button>
                              {step.details && expandedSteps[step.id] && (
                                <div className="mr-6 mt-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                                  {step.details}
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {isThinking && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                              </div>
                              <span className="text-xs text-slate-500">جاري العمل...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {currentSessionId && (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-wrap gap-2 mb-3">
                {quickCommands.slice(0, 4).map((cmd, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-xs text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    onClick={() => handleQuickCommand(cmd.command)}
                  >
                    <cmd.icon className="h-3 w-3" />
                    {cmd.label}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="اكتب رسالتك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)"
                    className="min-h-[48px] max-h-[150px] resize-none pr-4 pl-4 py-3 rounded-xl border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="h-12 w-12 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
