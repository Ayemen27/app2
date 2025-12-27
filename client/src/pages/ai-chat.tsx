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
  Sparkles
} from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  pending?: boolean;
  error?: string;
  feedback?: "thumbs_up" | "thumbs_down";
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

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "مرحباً! أنا مساعدك الذكي في إدارة مشاريع الإنشاء. يمكنني مساعدتك في:\n\n📊 **عرض البيانات**: استعلمات عن المشاريع والعمال والمصاريف\n✅ **تنفيذ العمليات**: إضافة بيانات جديدة بعد موافقتك\n📈 **التقارير**: توليد تقارير شاملة\n\nكيف يمكنني مساعدتك اليوم؟",
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
  const { data: accessData, isLoading: isAccessLoading } = useQuery({
    queryKey: ["/api/ai/access"],
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/ai/access", "GET");
        return res;
      } catch (error) {
        console.error("خطأ في التحقق من الوصول:", error);
        return { hasAccess: true }; // السماح كافتراضي والاعتماد على حماية الخادم
      }
    },
    retry: 1
  });

  // ✅ السماح للمسؤولين بالدخول فوراً بناءً على الحالة المحلية
  const hasAccess = user?.role === 'admin' || accessData?.hasAccess;

  if (isAccessLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!hasAccess && !isAccessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center p-8 max-w-md">
          <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">الوصول محدود</h1>
          <p className="text-slate-600 dark:text-slate-400">هذه الميزة متاحة فقط للمسؤولين</p>
          <Button 
            className="mt-6" 
            variant="outline" 
            onClick={() => setLocation('/')}
          >
            العودة للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  const createSessionMutation = useMutation({
    mutationFn: async (title: string) => {
      return await apiRequest("/api/ai/sessions", "POST", { title });
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId);
      setMessages([
        {
          role: "assistant",
          content: "محادثة جديدة جاهزة! كيف يمكنني مساعدتك؟",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!currentSessionId) {
        const sessionRes = await apiRequest("/api/ai/sessions", "POST", { 
          title: message.substring(0, 50) + (message.length > 50 ? "..." : "") 
        });
        setCurrentSessionId(sessionRes.sessionId);
        
        const chatRes = await apiRequest("/api/ai/chat", "POST", {
          sessionId: sessionRes.sessionId,
          message,
        });
        return { ...chatRes, sessionId: sessionRes.sessionId };
      }

      return await apiRequest("/api/ai/chat", "POST", {
        sessionId: currentSessionId,
        message,
      });
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "عذراً، حدث خطأ في المعالجة.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || "حدث خطأ في الاتصال";
      toast({
        title: "خطأ",
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
      if (currentSessionId) {
        setCurrentSessionId(null);
        setMessages([]);
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
    createSessionMutation.mutate("محادثة جديدة");
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "تم النسخ",
      description: "تم نسخ الرسالة إلى الحافظة",
    });
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 0);
      }
    }
  }, [messages]);

  const filteredSessions = sessions.filter((s: any) =>
    s.title.includes(searchQuery)
  );

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-64 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h1 className="font-bold text-sm">الوكيل الذكي</h1>
                    <p className="text-xs text-slate-500">AI Assistant</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSidebarOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                onClick={startNewChat}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                محادثة جديدة
              </Button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-8 h-8 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>

            {/* Sessions List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">لا توجد محادثات</p>
                  </div>
                ) : (
                  filteredSessions.map((session: any) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-2.5 rounded-lg cursor-pointer transition-all group ${
                        currentSessionId === session.id
                          ? "bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700"
                          : "hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent"
                      }`}
                      onClick={() => setCurrentSessionId(session.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                            {session.title}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {session.messagesCount} رسالة
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSessionMutation.mutate(session.id);
                          }}
                          className="h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <Button variant="ghost" className="w-full justify-start gap-2 text-sm" size="sm">
                <Settings className="h-4 w-4" />
                الإعدادات
              </Button>
              <p className="text-xs text-slate-500 px-2">النسخة 1.0</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 h-16 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-9 w-9"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                الوكيل الذكي
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              <ChevronDown className="h-3 w-3 mr-1" />
              النموذج الافتراضي
            </Button>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="max-w-4xl mx-auto w-full px-6 py-6 space-y-4 pb-96">
            <AnimatePresence mode="popLayout">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xl rounded-lg p-4 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                    {msg.error && (
                      <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {msg.error}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-current border-opacity-20">
                      <span className="text-xs opacity-70">
                        {msg.timestamp.toLocaleTimeString("ar-SA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {msg.pending && <Loader className="h-3 w-3 animate-spin" />}
                      {msg.role === "assistant" && !msg.error && (
                        <div className="flex items-center gap-1 ml-auto">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyMessage(msg.content)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Share2 className="h-3 w-3 ml-2" />
                                مشاركة
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <ThumbsUp className="h-3 w-3 ml-2" />
                                مفيد
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <ThumbsDown className="h-3 w-3 ml-2" />
                                غير مفيد
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <div className="flex-1 flex gap-2">
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
                  placeholder="اكتب رسالتك... (Shift+Enter للأسطر الجديدة)"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32"
                  rows={3}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              يمكنك طلب عرض البيانات، التقارير، أو تنفيذ العمليات. الوكيل الذكي يطلب موافقتك قبل تنفيذ أي تعديلات.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
