import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bot, Send, Plus, Trash2, MessageSquare, Loader2, 
  Brain, Search, Database, FileText, ChevronDown, ChevronUp,
  Users, Building2, Calculator, ClipboardList, Sparkles,
  CheckCircle, AlertCircle, Clock
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
  type: "thinking" | "searching" | "executing" | "responding";
  message: string;
  status: "active" | "done";
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
  const [message, setMessage] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState(false);

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
      setThinkingSteps([
        { id: "1", type: "thinking", message: "جاري التفكير...", status: "active" },
      ]);

      await new Promise(r => setTimeout(r, 500));
      setThinkingSteps(prev => [
        { ...prev[0], status: "done" },
        { id: "2", type: "searching", message: "جاري البحث في قاعدة البيانات...", status: "active" },
      ]);

      await new Promise(r => setTimeout(r, 400));
      setThinkingSteps(prev => [
        prev[0],
        { ...prev[1], status: "done" },
        { id: "3", type: "executing", message: "جاري تنفيذ الأمر...", status: "active" },
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

      setThinkingSteps(prev => [
        prev[0],
        prev[1],
        { ...prev[2], status: "done" },
        { id: "4", type: "responding", message: "تم الانتهاء", status: "done" },
      ]);

      await new Promise(r => setTimeout(r, 300));
      setIsThinking(false);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions", currentSessionId, "messages"] });
      setMessage("");
      setTimeout(() => setThinkingSteps([]), 2000);
    },
    onError: () => {
      setIsThinking(false);
      setThinkingSteps([]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinkingSteps]);

  const handleSend = () => {
    if (!message.trim() || !currentSessionId || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message);
  };

  const handleQuickCommand = (cmd: string) => {
    setMessage(cmd);
  };

  const getStepIcon = (type: string, status: string) => {
    if (status === "active") return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    if (status === "done") return <CheckCircle className="h-4 w-4 text-green-500" />;
    
    switch (type) {
      case "thinking": return <Brain className="h-4 w-4" />;
      case "searching": return <Search className="h-4 w-4" />;
      case "executing": return <Database className="h-4 w-4" />;
      case "responding": return <FileText className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (!accessData?.hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">غير مصرح</h2>
            <p className="text-muted-foreground">
              {accessData?.reason || "هذه الميزة متاحة فقط للمسؤولين"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 p-4">
      <Card className="w-64 flex-shrink-0 hidden md:flex md:flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              المحادثات
            </CardTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => createSessionMutation.mutate()}
              disabled={createSessionMutation.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-2">
          <ScrollArea className="h-full">
            {sessionsLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center p-4">
                لا توجد محادثات
              </p>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      currentSessionId === session.id ? "bg-muted" : ""
                    }`}
                    onClick={() => setCurrentSessionId(session.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.messagesCount} رسالة
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSessionMutation.mutate(session.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex-1 flex flex-col min-w-0">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">الوكيل الذكي</CardTitle>
                  <p className="text-xs text-muted-foreground">مساعدك في إدارة المشاريع</p>
                </div>
              </div>
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-4">
              {!currentSessionId ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Bot className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">مرحباً بك!</h3>
                  <p className="text-muted-foreground mb-6">
                    أنا الوكيل الذكي، يمكنني مساعدتك في إدارة المشاريع والعمال والمصروفات
                  </p>
                  <Button onClick={() => createSessionMutation.mutate()}>
                    <Plus className="h-4 w-4 ml-2" />
                    بدء محادثة جديدة
                  </Button>
                </div>
              ) : messagesLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.provider && (
                          <p className="text-[10px] opacity-60 mt-1">
                            {msg.provider} • {msg.model}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {thinkingSteps.length > 0 && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-muted/50 border rounded-2xl px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between p-0 h-auto mb-2"
                          onClick={() => setExpandedSteps(!expandedSteps)}
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                            جاري العمل...
                          </span>
                          {expandedSteps ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        {expandedSteps && (
                          <div className="space-y-2 border-t pt-2">
                            {thinkingSteps.map((step) => (
                              <div key={step.id} className="flex items-center gap-2 text-xs">
                                {getStepIcon(step.type, step.status)}
                                <span className={step.status === "done" ? "text-muted-foreground" : ""}>
                                  {step.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>

          {currentSessionId && (
            <div className="p-4 border-t space-y-3">
              <div className="flex flex-wrap gap-2">
                {quickCommands.map((cmd, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => handleQuickCommand(cmd.command)}
                  >
                    <cmd.icon className="h-3 w-3" />
                    {cmd.label}
                  </Button>
                ))}
              </div>
              <Separator />
              <div className="flex gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  className="min-h-[44px] max-h-32 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="px-4"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
