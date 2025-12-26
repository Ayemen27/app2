import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  PlusCircle
} from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutShell } from "@/components/layout/layout-shell";

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
    <LayoutShell showHeader={false} showNav={true}>
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
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
          <div className="max-w-2xl mx-auto space-y-6 pb-48">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${msg.role === "user" ? "justify-start flex-row-reverse" : "justify-start"} gap-3 items-end`}
                >
                  <div className={`p-2 rounded-xl ${
                    msg.role === "user" 
                      ? "bg-blue-600 text-white" 
                      : "bg-white dark:bg-slate-900 border shadow-sm"
                  }`}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-blue-500" />}
                  </div>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white dark:bg-slate-900 border text-slate-800 dark:text-slate-200 rounded-bl-none"
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

        {/* Floating Input Section */}
        <div className="fixed bottom-24 left-0 right-0 z-40 px-4 md:px-0 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            {/* Horizontal Quick Prompts */}
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar px-2 mask-fade-edges">
              {QUICK_PROMPTS.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-all text-[11px] font-medium gap-2 shadow-sm"
                  onClick={() => handleSend(prompt.text)}
                >
                  <div className="text-blue-500">{prompt.icon}</div>
                  {prompt.text}
                </Button>
              ))}
            </div>

            {/* Floating Input Field */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border border-white/20 dark:border-slate-800 shadow-2xl rounded-3xl p-2 flex items-center gap-2 mb-4 ring-1 ring-black/5 dark:ring-white/5">
              <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800">
                <PlusCircle className="h-6 w-6" />
              </Button>
              <Input
                placeholder="اسألني عن أي شيء في مشاريعك..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm h-10 px-0"
              />
              <Button 
                size="icon" 
                className={`rounded-full transition-all duration-300 shadow-md ${
                  input.trim() ? "bg-blue-600 scale-100" : "bg-slate-200 dark:bg-slate-800 scale-90 opacity-50"
                }`}
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
              >
                <Send className={`h-5 w-5 ${input.trim() ? "text-white" : "text-muted-foreground"}`} />
              </Button>
            </div>
          </div>
        </div>
        
        <style jsx global>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .mask-fade-edges {
            mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          }
        `}</style>
      </div>
    </LayoutShell>
  );
}
