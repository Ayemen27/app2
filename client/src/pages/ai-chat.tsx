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
  Menu,
  X,
  MessageCircle,
  BarChart3,
  Clock,
  Search,
  FileText
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

const ONBOARDING_ACTIONS = [
  { text: "خصص النص", icon: <FileText className="h-5 w-5" />, color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" },
  { text: "إنشاء صورة", icon: <BarChart3 className="h-5 w-5" />, color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
  { text: "اطرح أفكاراً", icon: <Clock className="h-5 w-5" />, color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400" },
  { text: "التعليمات البرمجية", icon: <FileText className="h-5 w-5" />, color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" },
];

const STORAGE_KEY = "ai_chat_sessions";
const ACTIVE_CHAT_KEY = "active_chat_id";
const ONBOARDING_VIEWED_KEY = "ai_chat_onboarding_viewed";

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

const hasViewedOnboarding = (): boolean => {
  return localStorage.getItem(ONBOARDING_VIEWED_KEY) === "true";
};

const markOnboardingViewed = () => {
  localStorage.setItem(ONBOARDING_VIEWED_KEY, "true");
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
  const [showOnboarding, setShowOnboarding] = useState(!hasViewedOnboarding());
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

  const startOnboardingNewChat = () => {
    markOnboardingViewed();
    setShowOnboarding(false);
    startNewChat();
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

  if (showOnboarding) {
    return (
      <OnboardingScreen
        onStart={startOnboardingNewChat}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        switchSession={switchSession}
        deleteSession={deleteSession}
        startNewChat={startNewChat}
      />
    );
  }

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

// Onboarding Screen
function OnboardingScreen({ onStart, sidebarOpen, setSidebarOpen, sessions, currentSessionId, switchSession, deleteSession, startNewChat }: any) {
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
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                <h2 className="font-bold text-sm">المحادثات</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="rounded-md">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <Button onClick={startNewChat} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2" size="sm">
                <PlusCircle className="h-4 w-4" />
                محادثة جديدة
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">لا توجد محادثات سابقة</p>
                  </div>
                ) : (
                  sessions.map((session: any) => (
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
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{session.title}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{formatTime(session.updatedAt)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e: any) => {
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

      <div className="flex flex-col flex-1 relative">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 h-14 flex items-center justify-between fixed top-0 left-0 right-0 z-40 shadow-md" style={{ marginLeft: sidebarOpen ? '288px' : '0px' }}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-md">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-full px-4 py-1.5 h-8 font-medium flex items-center gap-1">
              <span className="text-lg">+</span>
              <span>اشترك في Plus</span>
            </Button>
            <Button variant="ghost" size="icon" className="rounded-md">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Onboarding Content */}
        <div className="flex-1 flex items-center justify-center px-4 mt-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md"
          >
            {/* Icon */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <Bot className="h-12 w-12 text-white" />
            </motion.div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">كيف يمكنني المساعدة؟</h1>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-8 w-full">
              {ONBOARDING_ACTIONS.map((action, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onStart}
                  className={`p-3 rounded-lg flex flex-col items-center gap-1.5 transition-all ${action.color} border border-current border-opacity-20 text-center`}
                >
                  {action.icon}
                  <span className="text-xs font-medium leading-tight">{action.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
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
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                <h2 className="font-bold text-sm">المحادثات</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="rounded-md">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث"
                  className="ml-2 bg-transparent border-none outline-none text-xs w-full placeholder-slate-400 dark:placeholder-slate-500 dark:text-white"
                />
              </div>
            </div>
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <Button onClick={startNewChat} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2" size="sm">
                <PlusCircle className="h-4 w-4" />
                درسة جديدة
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">لا توجد محادثات سابقة</p>
                  </div>
                ) : (
                  sessions.map((session: any) => (
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
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{session.title}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{formatTime(session.updatedAt)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e: any) => {
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
      <div className="flex flex-col flex-1 relative">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 h-14 flex items-center justify-between fixed top-0 left-0 right-0 z-40 shadow-md" style={{ marginLeft: sidebarOpen ? '288px' : '0px' }}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-md">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-full px-4 py-1.5 h-8 font-medium flex items-center gap-1">
              <span className="text-lg">+</span>
              <span>اشترك في Plus</span>
            </Button>
            <Button variant="ghost" size="icon" className="rounded-md">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4 mt-14">
          <div className="max-w-3xl mx-auto space-y-4 pb-72">
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
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-[#F5F5F7] dark:from-slate-950 via-[#F5F5F7]/90 dark:via-slate-950/90 to-transparent" style={{ width: sidebarOpen ? 'calc(100% - 288px)' : '100%' }}>
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

            {/* Input Box - Simplified */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden flex items-center border border-slate-200 dark:border-slate-800">
              <div className="p-3 flex-1">
                <textarea
                  ref={textareaRef}
                  placeholder="Ask ChatGPT"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="w-full bg-transparent border-none focus:ring-0 text-[15px] resize-none min-h-[40px] max-h-[150px] placeholder-slate-400 dark:placeholder-slate-500 overflow-y-auto custom-scrollbar text-slate-900 dark:text-white"
                  rows={1}
                  data-testid="input-chat-message"
                />
              </div>

              {/* Send Button Only */}
              <div className="flex items-center justify-end px-4 py-2">
                <Button 
                  size="icon" 
                  className={`h-8 w-8 rounded-lg transition-all duration-300 flex items-center justify-center ${
                    input.trim() ? "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  data-testid="button-send-message"
                >
                  <Send className="h-3.5 w-3.5" style={{ transform: 'rotate(-45deg)' }} />
                </Button>
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
