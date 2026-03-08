import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, Bot, Copy, Trash2, Plus, MessageSquare, ArrowUp,
  Sparkles, Loader2, PanelRightOpen, PanelRightClose, X,
  FileText, BarChart3, Users, ShieldCheck, Check, Play, Ban,
  Table
} from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  pending?: boolean;
  error?: string;
  steps?: { title: string; status: 'completed' | 'in_progress' | 'pending'; description?: string }[];
  data?: any;
  operationHandled?: boolean;
}

function extractOperationId(content: string): string | null {
  const match = content.match(/معرف العملية:\*?\*?\s*(op_[a-zA-Z0-9_]+)/);
  return match ? match[1] : null;
}

function DataTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;
  const columns = Object.keys(data[0]);
  return (
    <div className="mt-3 border rounded-lg overflow-x-auto" dir="rtl">
      <table className="w-full text-xs" data-testid="table-data-display">
        <thead>
          <tr className="bg-muted/70 border-b">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri} className="border-b last:border-b-0" data-testid={`row-data-${ri}`}>
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 text-right whitespace-nowrap">
                  {row[col] != null ? String(row[col]) : "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function tryParseDataFromContent(content: string): any[] | null {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        return parsed;
      }
    } catch {}
  }
  return null;
}

export default function AIChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: sessions = [] } = useQuery({
    queryKey: QUERY_KEYS.aiSessions,
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/ai/sessions", "GET");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });

  const { data: accessData, isLoading: isAccessLoading } = useQuery({
    queryKey: QUERY_KEYS.aiAccess,
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/ai/access", "GET");
        return res;
      } catch {
        if (user?.role === 'admin' || user?.role === 'super_admin') {
          return { hasAccess: true };
        }
        throw new Error("Access denied");
      }
    },
    retry: 1,
    staleTime: 30000
  });

  const hasAccess = user?.role === 'admin' || user?.role === 'super_admin' || accessData?.hasAccess;

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      setIsLoading(true);
      try {
        let activeSessionId = currentSessionId;
        if (!activeSessionId) {
          const sessionRes = await apiRequest("/api/ai/sessions", "POST", { 
            title: message.substring(0, 50) + (message.length > 50 ? "..." : "") 
          });
          activeSessionId = sessionRes.sessionId;
          setCurrentSessionId(activeSessionId);
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiSessions });
        }
        const chatRes = await apiRequest("/api/ai/chat", "POST", {
          sessionId: activeSessionId,
          message,
        });
        return { ...chatRes, sessionId: activeSessionId };
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiSessions });
      const messageContent = data.message || "عذراً، لم أتمكن من معالجة الطلب حالياً.";
      const messageData = data.data;
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: messageContent,
        timestamp: new Date(),
        steps: data.steps,
        data: messageData,
      }]);
    },
    onError: (error: any) => {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.",
        timestamp: new Date(),
        error: error.message,
      }]);
    },
  });

  const executeOperationMutation = useMutation({
    mutationFn: async (operationId: string) => {
      setPendingOperations(prev => new Set(prev).add(operationId));
      const res = await apiRequest("/api/ai/execute-operation", "POST", {
        operationId,
        sessionId: currentSessionId,
      });
      return { ...res, operationId };
    },
    onSuccess: (data) => {
      setPendingOperations(prev => {
        const next = new Set(prev);
        next.delete(data.operationId);
        return next;
      });
      setMessages((prev) => {
        const updated = prev.map(m => {
          const opId = extractOperationId(m.content);
          if (opId === data.operationId) return { ...m, operationHandled: true };
          return m;
        });
        return [...updated, {
          role: "assistant" as const,
          content: data.message || "تم تنفيذ العملية بنجاح.",
          timestamp: new Date(),
          data: data.data,
        }];
      });
    },
    onError: (error: any, operationId: string) => {
      setPendingOperations(prev => {
        const next = new Set(prev);
        next.delete(operationId);
        return next;
      });
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `فشل تنفيذ العملية: ${error.message || "خطأ غير معروف"}`,
        timestamp: new Date(),
        error: error.message,
      }]);
    },
  });

  const cancelOperationMutation = useMutation({
    mutationFn: async (operationId: string) => {
      setPendingOperations(prev => new Set(prev).add(operationId));
      const res = await apiRequest(`/api/ai/operations/${operationId}?sessionId=${currentSessionId}`, "DELETE");
      return { ...res, operationId };
    },
    onSuccess: (data) => {
      setPendingOperations(prev => {
        const next = new Set(prev);
        next.delete(data.operationId);
        return next;
      });
      setMessages((prev) => {
        const updated = prev.map(m => {
          const opId = extractOperationId(m.content);
          if (opId === data.operationId) return { ...m, operationHandled: true };
          return m;
        });
        return [...updated, {
          role: "assistant" as const,
          content: data.message || "تم إلغاء العملية.",
          timestamp: new Date(),
        }];
      });
    },
    onError: (error: any, operationId: string) => {
      setPendingOperations(prev => {
        const next = new Set(prev);
        next.delete(operationId);
        return next;
      });
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `فشل إلغاء العملية: ${error.message || "خطأ غير معروف"}`,
        timestamp: new Date(),
        error: error.message,
      }]);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/ai/sessions/${sessionId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiSessions });
      if (currentSessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    },
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = { role: "user", content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    try {
      await sendMessageMutation.mutateAsync(currentInput);
    } catch {}
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleSessionClick = async (sessionId: string) => {
    if (currentSessionId === sessionId) return;
    setCurrentSessionId(sessionId);
    setSidebarOpen(false);
    setMessages([{ role: "assistant", content: "جاري تحميل المحادثة...", timestamp: new Date(), pending: true }]);
    try {
      const res = await apiRequest(`/api/ai/sessions/${sessionId}/messages`, "GET");
      if (Array.isArray(res) && res.length > 0) {
        setMessages(res.map((m: any) => ({ role: m.role, content: m.content, timestamp: new Date(m.created_at), steps: m.steps, data: m.data })));
      } else {
        setMessages([]);
      }
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل الرسائل", variant: "destructive" });
      setMessages([]);
    }
  };

  const copyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) setTimeout(() => { viewport.scrollTop = viewport.scrollHeight; }, 50);
    }
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  if (isAccessLoading && !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess && !isAccessLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
          <p className="text-sm text-muted-foreground mb-6">هذه الميزة متاحة فقط للمسؤولين</p>
          <Button onClick={() => setLocation('/')} data-testid="button-back-home">العودة للرئيسية</Button>
        </div>
      </div>
    );
  }

  const isNewChat = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] relative" dir="rtl">
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: 280 }}
              animate={{ x: 0 }}
              exit={{ x: 280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 bottom-0 right-0 w-72 bg-card border-l z-50 flex flex-col shadow-xl"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">المحادثات السابقة</h3>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="h-8 w-8" data-testid="button-close-sidebar">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-3">
                <Button onClick={() => { startNewChat(); setSidebarOpen(false); }} variant="outline" className="w-full gap-2 h-9 text-sm" data-testid="button-new-chat-sidebar">
                  <Plus className="h-3.5 w-3.5" />
                  محادثة جديدة
                </Button>
              </div>
              <ScrollArea className="flex-1 px-3">
                <div className="space-y-1 pb-4">
                  {sessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">لا توجد محادثات سابقة</p>
                  ) : sessions.map((session: any) => (
                    <div
                      key={session.id}
                      onClick={() => handleSessionClick(session.id)}
                      className={`group flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                        currentSessionId === session.id 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "hover:bg-muted text-foreground"
                      }`}
                      data-testid={`session-item-${session.id}`}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      <span className="truncate flex-1">{session.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); deleteSessionMutation.mutate(session.id); }}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0"
                        data-testid={`button-delete-session-${session.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 px-3 py-2 border-b bg-card/50">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)} data-testid="button-open-sidebar">
          <PanelRightOpen className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-muted-foreground truncate block">
            {currentSessionId ? sessions.find((s: any) => s.id === currentSessionId)?.title || 'محادثة' : 'محادثة جديدة'}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={startNewChat} data-testid="button-new-chat">
          <Plus className="h-3.5 w-3.5" />
          جديدة
        </Button>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {isNewChat ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 text-foreground" data-testid="text-welcome-title">
                كيف يمكنني مساعدتك اليوم؟
              </h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-md">
                يمكنني تحليل بيانات المشاريع، إنشاء التقارير، ومساعدتك في إدارة العمليات
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {[
                  { title: "تقرير المشاريع", desc: "ملخص شامل للمشاريع النشطة", icon: FileText, prompt: "أريد تقريراً شاملاً عن حالة المشاريع النشطة" },
                  { title: "تحليل المصروفات", desc: "رصد الإنفاق والتدفقات المالية", icon: BarChart3, prompt: "حلل المصروفات في آخر 30 يوماً" },
                  { title: "مستحقات العمال", desc: "كشف حساب العمال والمستحقات", icon: Users, prompt: "اعرض مستحقات العمال المتبقية" },
                  { title: "التدقيق المالي", desc: "كشف التضاربات في السجلات", icon: ShieldCheck, prompt: "هل توجد عمليات غير منطقية في السجلات المالية؟" },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(item.prompt)}
                    className="flex items-start gap-3 p-3.5 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-right group"
                    data-testid={`button-suggestion-${i}`}
                  >
                    <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors shrink-0">
                      <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => {
                const operationId = message.role === "assistant" && !message.pending ? extractOperationId(message.content) : null;
                const showConfirmation = operationId && !message.operationHandled;
                const isOperationPending = operationId ? pendingOperations.has(operationId) : false;
                const tableData = message.role === "assistant" && !message.pending
                  ? (Array.isArray(message.data) && message.data.length > 0 && typeof message.data[0] === 'object'
                    ? message.data
                    : tryParseDataFromContent(message.content))
                  : null;

                return (
                  <div key={index} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      message.role === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    }`}>
                      {message.role === "user" 
                        ? <span className="text-xs font-bold">{user?.email?.[0]?.toUpperCase()}</span>
                        : <Bot className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                    <div className={`flex-1 min-w-0 ${message.role === "user" ? "text-right" : ""}`}>
                      <div className={`inline-block max-w-full rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-md"
                          : message.error 
                            ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-md"
                            : "bg-muted rounded-tl-md"
                      }`}>
                        {message.pending ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">جاري المعالجة...</span>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed" data-testid={`text-message-${index}`}>{message.content}</p>
                        )}
                      </div>
                      {showConfirmation && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap" data-testid={`confirmation-actions-${operationId}`}>
                          <Button
                            size="sm"
                            onClick={() => executeOperationMutation.mutate(operationId)}
                            disabled={isOperationPending}
                            className="gap-1.5"
                            data-testid={`button-execute-operation-${operationId}`}
                          >
                            {isOperationPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            تنفيذ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelOperationMutation.mutate(operationId)}
                            disabled={isOperationPending}
                            className="gap-1.5"
                            data-testid={`button-cancel-operation-${operationId}`}
                          >
                            {isOperationPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                            إلغاء
                          </Button>
                        </div>
                      )}
                      {tableData && <DataTable data={tableData} />}
                      {message.role === "assistant" && !message.pending && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => copyMessage(message.content, index)}
                            data-testid={`button-copy-${index}`}
                          >
                            {copiedIndex === index ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </Button>
                          <span className="text-[10px] text-muted-foreground">
                            {message.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      {message.steps && message.steps.length > 0 && (
                        <div className="mt-2 p-3 rounded-lg bg-muted/50 border text-xs space-y-1.5">
                          {message.steps.map((step, si) => (
                            <div key={si} className="flex items-center gap-2">
                              {step.status === 'completed' 
                                ? <Check className="h-3 w-3 text-green-500" />
                                : step.status === 'in_progress'
                                  ? <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                  : <div className="h-3 w-3 rounded-full border" />
                              }
                              <span className="text-muted-foreground">{step.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-muted/50 border rounded-2xl p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="اكتب رسالتك هنا..."
              className="flex-1 border-0 bg-transparent resize-none min-h-[40px] max-h-[160px] text-sm focus-visible:ring-0 focus-visible:ring-offset-0 p-2"
              rows={1}
              disabled={isLoading}
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-9 w-9 rounded-xl shrink-0"
              data-testid="button-send-message"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            المساعد الذكي قد يرتكب أخطاء. تحقق من المعلومات المهمة.
          </p>
        </div>
      </div>
    </div>
  );
}
