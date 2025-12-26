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
  Box
} from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  { text: "ملخص مالي للمشاريع", icon: <DollarSign className="h-4 w-4" /> },
  { text: "حالة العمال اليوم", icon: <Users className="h-4 w-4" /> },
  { text: "موقف المواد والمخزون", icon: <Package className="h-4 w-4" /> },
  { text: "توقعات المصاريف القادمة", icon: <Activity className="h-4 w-4" /> },
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "أهلاً بك! أنا مساعدك الذكي في إدارة المشاريع الإنشائية. كيف يمكنني مساعدتك اليوم؟",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

    const userMessage: Message = { role: "user", content: messageContent };
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

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F7] dark:bg-slate-950 overflow-hidden relative">
      {/* Custom Header for AI Chat */}
      <header className="bg-white dark:bg-slate-900 border-b px-4 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.history.back()}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
              <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold">المساعد الذكي</h1>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-muted-foreground font-medium">متصل الآن</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground">
            <History className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-red-500"
            onClick={() => setMessages([messages[0]])}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Chat Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-6 pb-64">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === "user" ? "justify-start flex-row-reverse" : "justify-start"} gap-3 items-start`}
              >
                <div className={`p-2 rounded-xl mt-1 ${
                  msg.role === "user" 
                    ? "bg-blue-600 text-white" 
                    : "bg-white dark:bg-slate-900 border shadow-sm"
                }`}>
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-blue-500" />}
                </div>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-white dark:bg-slate-900 border text-slate-800 dark:text-slate-200 rounded-tl-none"
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex justify-start gap-3 items-center">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border shadow-sm">
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

      {/* Replit Style Input Box */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-[#F5F5F7] dark:from-slate-950 via-[#F5F5F7]/90 dark:via-slate-950/90 to-transparent">
        <div className="max-w-3xl mx-auto">
          {/* Horizontal Quick Prompts */}
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar px-1">
            {QUICK_PROMPTS.map((prompt, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="whitespace-nowrap rounded-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-[11px] font-medium gap-2 shadow-sm py-1"
                onClick={() => handleSend(prompt.text)}
              >
                <div className="text-blue-500">{prompt.icon}</div>
                {prompt.text}
              </Button>
            ))}
          </div>

          {/* Input Box Container */}
          <div className="bg-white dark:bg-slate-900 border-2 border-blue-500/20 dark:border-blue-500/40 rounded-xl shadow-xl overflow-hidden ring-4 ring-blue-500/5">
            {/* Textarea */}
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
              />
            </div>

            {/* Bottom Toolbar (Replit Style) */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-md">
                  <Box className="h-3.5 w-3.5" />
                  Bui...
                  <motion.span animate={{ rotate: 180 }} className="text-[10px]">v</motion.span>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-500">
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md bg-[#FFD700] hover:bg-[#FFD700]/90 text-slate-900">
                  <Zap className="h-4 w-4 fill-current" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-500">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  className={`h-8 w-8 rounded-md transition-all duration-300 ${
                    input.trim() ? "bg-[#9A85FF] hover:bg-[#9A85FF]/90 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                  }`}
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                >
                  <Send className="h-4 w-4 -rotate-45 relative left-0.5 bottom-0.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
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
