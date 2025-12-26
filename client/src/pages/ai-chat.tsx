import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  ArrowLeft, 
  History,
  Trash2,
  DollarSign,
  Users,
  Package,
  Activity,
  PlusCircle,
  Paperclip,
  Zap,
  SlidersHorizontal,
  Box,
  Menu,
  X,
  MessageCircle
} from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const QUICK_PROMPTS = [
  { text: "ملخص مالي للمشاريع", icon: <DollarSign className="h-4 w-4" /> },
  { text: "حالة العمال اليوم", icon: <Users className="h-4 w-4" /> },
  { text: "موقف المواد والمخزون", icon: <Package className="h-4 w-4" /> },
  { text: "توقعات المصاريف القادمة", icon: <Activity className="h-4 w-4" /> },
];

const STORAGE_KEY = "ai_chat_sessions";
const ACTIVE_CHAT_KEY = "active_chat_id";

// الدالات المساعدة للتخزين
const loadSessions = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const sessions = JSON.parse(stored) as ChatSession[];
    return sessions.map(s => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
      messages: s.messages.map(m => ({
        ...m,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
      }))
    }));
  } catch {
    return [];
  }
};

const saveSessions = (sessions: ChatSession[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

const getActiveSessionId = (): string | null => {
  return localStorage.getItem(ACTIVE_CHAT_KEY);
};

const setActiveSessionId = (id: string) => {
  localStorage.setItem(ACTIVE_CHAT_KEY, id);
};

const generateSessionId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const generateSessionTitle = (messages: Message[]): string => {
  const firstMessage = messages.find(m => m.role === "user");
  if (firstMessage && firstMessage.content.length > 0) {
    return firstMessage.content.substring(0, 30) + (firstMessage.content.length > 30 ? "..." : "");
  }
  return `محادثة جديدة - ${new Date().toLocaleDateString('ar')}`;
};

const formatTime = (date: Date | undefined): string => {
  if (!date) return "";
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  if (hours < 24) return `قبل ${hours} ساعة`;
  if (days < 7) return `قبل ${days} يوم`;
  
  return new Date(date).toLocaleDateString('ar');
};

export default function AIChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(getActiveSessionId);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "أهلاً بك! أنا مساعدك الذكي في إدارة المشاريع الإنشائية. كيف يمكنني مساعدتك اليوم؟",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // تحميل المحادثة النشطة
  useEffect(() => {
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) {
        setMessages(session.messages);
      }
    }
  }, [currentSessionId, sessions]);

  // حفظ المحادثة الحالية
  useEffect(() => {
    if (messages.length > 1 || (messages.length === 1 && messages[0].role === "user")) {
      let session = sessions.find(s => s.id === currentSessionId);
      
      if (!session) {
        const newSession: ChatSession = {
          id: generateSessionId(),
          title: generateSessionTitle(messages),
          messages,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        session = newSession;
        setSessions([newSession, ...sessions]);
        setCurrentSessionId(newSession.id);
        setActiveSessionId(newSession.id);
      } else {
        session.messages = messages;
        session.updatedAt = new Date();
        session.title = generateSessionTitle(messages);
        setSessions([...sessions]);
      }
      saveSessions([...sessions]);
    }
  }, [messages]);

  // التمرير التلقائي
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async (content?: string) => {
    const messageContent = content || input;
    if (!messageContent.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: messageContent, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageContent }),
      });

      if (!response.ok) throw new Error("فشل في الحصول على رد");

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response || "عذراً، لم أتمكن من فهم الطلب.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "تعذر الاتصال بالمساعد الذكي",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        role: "assistant",
        content: "أهلاً بك! أنا مساعدك الذكي في إدارة المشاريع الإنشائية. كيف يمكنني مساعدتك اليوم؟",
        timestamp: new Date(),
      },
    ]);
    setSidebarOpen(false);
  };

  const deleteSession = (id: string) => {
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    saveSessions(newSessions);
    
    if (currentSessionId === id) {
      startNewChat();
    }
  };

  const switchSession = (id: string) => {
    setCurrentSessionId(id);
    setActiveSessionId(id);
    setSidebarOpen(false);
  };

  return (
    <AIChatContainer 
      messages={messages} 
      input={input} 
      isLoading={isLoading} 
      setInput={setInput} 
      setMessages={setMessages} 
      handleSend={handleSend} 
      scrollAreaRef={scrollAreaRef}
      textareaRef={textareaRef}
      setLocation={setLocation} 
      user={user}
      sessions={sessions}
      currentSessionId={currentSessionId}
      startNewChat={startNewChat}
      switchSession={switchSession}
      deleteSession={deleteSession}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    />
  );
}

// AI Chat Container with Sidebar
function AIChatContainer({ 
  messages, 
  input, 
  isLoading, 
  setInput, 
  setMessages, 
  handleSend, 
  scrollAreaRef, 
  textareaRef, 
  setLocation, 
  user,
  sessions,
  currentSessionId,
  startNewChat,
  switchSession,
  deleteSession,
  sidebarOpen,
  setSidebarOpen
}: any) {
  return (
    <div className="flex h-screen w-full bg-[#F5F5F7] dark:bg-slate-950 overflow-hidden relative" dir="rtl">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-40 flex flex-col shadow-lg"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                <h2 className="font-bold text-sm">المحادثات</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="rounded-md"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* New Chat Button */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <Button
                onClick={startNewChat}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2"
                size="sm"
              >
                <PlusCircle className="h-4 w-4" />
                محادثة جديدة
              </Button>
            </div>

            {/* Sessions List */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">لا توجد محادثات سابقة</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-lg cursor-pointer transition-all group ${
                        currentSessionId === session.id
                          ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
                          : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent"
                      }`}
                      onClick={() => switchSession(session.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {session.title}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            {formatTime(session.updatedAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          className="h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 h-14 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-md"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
                <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold">Agent</h1>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-muted-foreground font-medium">متصل الآن</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-md text-muted-foreground"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <History className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-md text-red-500"
              onClick={() => setMessages([messages[0]])}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4">
          <div className="max-w-3xl mx-auto space-y-4 pb-64">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${msg.role === "user" ? "justify-start flex-row-reverse" : "justify-start"} gap-3 items-end group`}
                >
                  <div className={`p-2 rounded-xl mt-1 ${
                    msg.role === "user" 
                      ? "bg-blue-600 text-white" 
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                  }`}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-blue-500" />}
                  </div>
                  <div className="flex flex-col">
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none"
                    }`}>
                      {msg.content}
                    </div>
                    <span className={`text-[11px] mt-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                      msg.role === "user" ? "text-right" : "text-left"
                    } ${msg.role === "user" ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"}`}>
                      {msg.timestamp && formatTime(msg.timestamp)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="flex justify-start gap-3 items-center">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <Bot className="h-4 w-4 text-blue-500 animate-bounce" />
                </div>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-[#F5F5F7] dark:from-slate-950 via-[#F5F5F7]/90 dark:via-slate-950/90 to-transparent">
          <div className="max-w-3xl mx-auto">
            {/* Quick Prompts */}
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar px-1">
              {QUICK_PROMPTS.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap rounded-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-[11px] font-medium gap-2 shadow-sm py-1"
                  onClick={() => handleSend(prompt.text)}
                  data-testid={`button-quick-prompt-${i}`}
                >
                  <div className="text-blue-500">{prompt.icon}</div>
                  {prompt.text}
                </Button>
              ))}
            </div>

            {/* Input Box */}
            <div className="bg-white dark:bg-slate-900 border-2 border-blue-500/20 dark:border-blue-500/40 rounded-xl shadow-xl overflow-hidden ring-4 ring-blue-500/5">
              <div className="p-3">
                <textarea
                  ref={textareaRef}
                  placeholder="What can I help you build?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="w-full bg-transparent border-none focus:ring-0 text-[15px] resize-none min-h-[40px] max-h-[150px] placeholder-slate-400 dark:placeholder-slate-500 overflow-y-auto custom-scrollbar"
                  rows={1}
                  data-testid="input-chat-message"
                />
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-md" data-testid="button-build-dropdown">
                    <Box className="h-3.5 w-3.5" />
                    Bui...
                    <motion.span animate={{ rotate: 180 }} className="text-[10px]">v</motion.span>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-500" data-testid="button-attach-file">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md bg-[#FFD700] hover:bg-[#FFD700]/90 text-slate-900" data-testid="button-magic">
                    <Zap className="h-4 w-4 fill-current" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-500" data-testid="button-settings">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    className={`h-8 w-8 rounded-md transition-all duration-300 ${
                      input.trim() ? "bg-[#9A85FF] hover:bg-[#9A85FF]/90 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                    }`}
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4 -rotate-45 relative left-0.5 bottom-0.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1E293B;
        }
      `}</style>
    </div>
  );
}
