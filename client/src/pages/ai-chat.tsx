import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, Bot, Copy, Trash2, Plus, MessageSquare, ArrowUp,
  Sparkles, Loader2, PanelRightOpen, PanelRightClose, X,
  FileText, BarChart3, Users, ShieldCheck, Check, Play, Ban,
  Table, Archive, RotateCcw, Settings, ChevronLeft, CheckSquare, Square,
  FileDown
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

function generatePrintPDF(content: string, tableData: any[] | null, title?: string) {
  const reportTitle = title || "تقرير من الوكيل الذكي";
  const dateStr = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

  let tableHTML = "";
  if (tableData && tableData.length > 0) {
    const cols = Object.keys(tableData[0]);
    tableHTML = `
      <table>
        <thead>
          <tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${tableData.map(row => `<tr>${cols.map(c => `<td>${row[c] != null ? String(row[c]) : "-"}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>`;
  }

  const contentHTML = content
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/━+/g, "<hr/>")
    .replace(/\n/g, "<br/>");

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>${reportTitle}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', 'Arial', sans-serif; direction: rtl; font-size: 12pt; color: #1a1a2e; background: #fff; padding: 20px; }
  .header { background: linear-gradient(135deg, #1E3A5F, #2E86AB); color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 20px; }
  .header h1 { font-size: 16pt; font-weight: 700; }
  .header .date { font-size: 10pt; opacity: 0.85; margin-top: 4px; }
  .content { line-height: 1.8; color: #333; white-space: pre-wrap; padding: 0 4px; }
  .content strong { color: #1E3A5F; font-weight: 700; }
  .content hr { border: none; border-top: 1px solid #ddd; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #1E3A5F; color: white; padding: 8px 10px; font-size: 10pt; text-align: right; }
  td { padding: 7px 10px; font-size: 10pt; border-bottom: 1px solid #eee; text-align: right; }
  tr:nth-child(even) td { background: #f8f9fb; }
  .footer { margin-top: 24px; text-align: center; font-size: 9pt; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="header">
  <h1>${reportTitle}</h1>
  <div class="date">${dateStr}</div>
</div>
<div class="content">${contentHTML}</div>
${tableHTML}
<div class="footer">نظام إدارة المشاريع الإنشائية — تم إنشاء هذا التقرير تلقائياً</div>
<script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} د`;
  if (diffHours < 24) return `منذ ${diffHours} س`;
  if (diffDays === 1) return "أمس";
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
  return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

function extractOperationId(content: string): string | null {
  const match = content.match(/معرف العملية:\*?\*?\s*(op_[a-zA-Z0-9_]+)/);
  return match ? match[1] : null;
}

function DataTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;
  const columns = Object.keys(data[0]);

  if (columns.length <= 3) {
    return (
      <div className="mt-3 border rounded-lg overflow-x-auto" dir="rtl">
        <table className="w-full text-xs" data-testid="table-data-display">
          <thead>
            <tr className="bg-muted/70 border-b">
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri} className="border-b last:border-b-0" data-testid={`row-data-${ri}`}>
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-right">{row[col] != null ? String(row[col]) : "-"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2" dir="rtl">
      {data.map((row, ri) => (
        <div key={ri} className="border rounded-lg p-3 bg-muted/30 text-xs space-y-1" data-testid={`row-data-${ri}`}>
          {columns.map((col) => (
            <div key={col} className="flex justify-between gap-2">
              <span className="text-muted-foreground font-medium shrink-0">{col}</span>
              <span className="text-right break-all">{row[col] != null ? String(row[col]) : "-"}</span>
            </div>
          ))}
        </div>
      ))}
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

function SwipeableSessionItem({ session, isActive, onSelect, onDelete, onArchive }: {
  session: any; isActive: boolean;
  onSelect: () => void; onDelete: () => void; onArchive: () => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [revealed, setRevealed] = useState<'none' | 'delete' | 'archive'>('none');
  const startX = useRef(0);
  const startY = useRef(0);
  const dirLocked = useRef<'none' | 'horizontal' | 'vertical'>('none');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showActions, setShowActions] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 10;
  const SNAP_WIDTH = 80;
  const FULL_SWIPE_RATIO = 0.6;

  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;

    let sX = 0, sY = 0, locked: 'none' | 'horizontal' | 'vertical' = 'none';
    let lpTimer: ReturnType<typeof setTimeout> | null = null;
    let hasMoved = false;
    let currentOff = 0;
    let elWidth = 0;

    const onStart = (e: PointerEvent) => {
      sX = e.clientX; sY = e.clientY;
      locked = 'none'; hasMoved = false; currentOff = 0;
      dirLocked.current = 'none';
      elWidth = el.offsetWidth;
      el.setPointerCapture(e.pointerId);
      lpTimer = setTimeout(() => {
        if (!hasMoved) { setShowActions(true); }
      }, 500);
    };

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - sX;
      const dy = e.clientY - sY;

      if (locked === 'none') {
        if (Math.abs(dy) > THRESHOLD) { locked = 'vertical'; dirLocked.current = 'vertical'; if (lpTimer) clearTimeout(lpTimer); return; }
        if (Math.abs(dx) > THRESHOLD) { locked = 'horizontal'; dirLocked.current = 'horizontal'; if (lpTimer) clearTimeout(lpTimer); hasMoved = true; }
        else return;
      }

      if (locked === 'vertical') return;

      e.preventDefault();
      currentOff = dx;
      setOffsetX(dx);
    };

    const onEnd = (e: PointerEvent) => {
      if (lpTimer) clearTimeout(lpTimer);

      if (locked === 'horizontal') {
        const ratio = Math.abs(currentOff) / elWidth;
        if (currentOff > 0 && ratio > FULL_SWIPE_RATIO) {
          setOffsetX(elWidth);
          setTimeout(() => { onDelete(); setOffsetX(0); setRevealed('none'); }, 250);
        } else if (currentOff < 0 && ratio > FULL_SWIPE_RATIO) {
          setOffsetX(-elWidth);
          setTimeout(() => { onArchive(); setOffsetX(0); setRevealed('none'); }, 250);
        } else if (currentOff > 40) {
          setOffsetX(SNAP_WIDTH); setRevealed('delete');
        } else if (currentOff < -40) {
          setOffsetX(-SNAP_WIDTH); setRevealed('archive');
        } else {
          setOffsetX(0); setRevealed('none');
        }
      } else if (!hasMoved && !showActions) {
        onSelect();
      }

      locked = 'none'; dirLocked.current = 'none';
    };

    const onCancel = () => {
      if (lpTimer) clearTimeout(lpTimer);
      setOffsetX(0); setRevealed('none');
      locked = 'none'; dirLocked.current = 'none';
    };

    el.addEventListener('pointerdown', onStart, { passive: true });
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('pointerup', onEnd, { passive: true });
    el.addEventListener('pointercancel', onCancel, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', onStart);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onEnd);
      el.removeEventListener('pointercancel', onCancel);
      if (lpTimer) clearTimeout(lpTimer);
    };
  }, [onSelect, onDelete, onArchive, showActions]);

  const swipingRight = offsetX > 5;
  const swipingLeft = offsetX < -5;

  return (
    <div className="relative overflow-hidden rounded-lg mb-1" data-testid={`session-item-${session.id}`}>
      {swipingRight && (
        <div className="absolute inset-0 z-0 bg-red-500 flex items-center ps-4 gap-1.5">
          <Trash2 className="h-5 w-5 text-white" />
          <span className="text-white text-xs font-medium">حذف</span>
        </div>
      )}
      {swipingLeft && (
        <div className="absolute inset-0 z-0 bg-blue-500 flex items-center justify-end pe-4 gap-1.5">
          <span className="text-white text-xs font-medium">أرشفة</span>
          <Archive className="h-5 w-5 text-white" />
        </div>
      )}
      <div
        ref={itemRef}
        className={`relative z-10 flex items-start gap-2.5 p-2.5 text-sm select-none bg-card text-foreground ${
          isActive ? "ring-1 ring-inset ring-primary/30 text-primary font-medium" : ""
        }`}
        style={{ 
          transform: `translate3d(${offsetX}px, 0, 0)`, 
          transition: dirLocked.current === 'horizontal' ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          touchAction: 'pan-y',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      >
        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="truncate block text-sm">{session.title}</span>
          <span className="text-[10px] text-muted-foreground">{formatRelativeTime(session.lastMessageAt || session.updated_at || session.created_at)}</span>
        </div>
      </div>
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative z-10 flex gap-1 p-1.5 bg-muted border-t"
          >
            <Button size="sm" variant="destructive" className="flex-1 h-7 text-[11px] gap-1" onClick={() => { setShowActions(false); onDelete(); }}>
              <Trash2 className="h-3 w-3" /> حذف
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] gap-1" onClick={() => { setShowActions(false); onArchive(); }}>
              <Archive className="h-3 w-3" /> أرشفة
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setShowActions(false)}>
              إلغاء
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function groupSessionsByTime(sessions: any[]): { label: string; items: any[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  const groups: { label: string; items: any[] }[] = [
    { label: "اليوم", items: [] },
    { label: "هذا الأسبوع", items: [] },
    { label: "هذا الشهر", items: [] },
    { label: "أقدم", items: [] },
  ];

  for (const s of sessions) {
    const d = new Date(s.lastMessageAt || s.updated_at || s.created_at);
    if (d >= today) groups[0].items.push(s);
    else if (d >= weekAgo) groups[1].items.push(s);
    else if (d >= monthAgo) groups[2].items.push(s);
    else groups[3].items.push(s);
  }

  return groups.filter(g => g.items.length > 0);
}

export default function AIChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<'chats' | 'archived' | 'settings'>('chats');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
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

  const { data: archivedSessions = [] } = useQuery({
    queryKey: ['ai-archived-sessions'],
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/ai/sessions/archived", "GET");
        return Array.isArray(res) ? res : [];
      } catch { return []; }
    },
    enabled: !!user && sidebarView === 'archived',
  });

  const { data: chatStats, isLoading: statsLoading } = useQuery({
    queryKey: ['ai-chat-stats'],
    queryFn: async () => {
      const res = await apiRequest("/api/ai/stats", "GET");
      return res;
    },
    enabled: !!user && sidebarOpen,
    staleTime: 10000,
  });

  const groupedSessions = useMemo(() => groupSessionsByTime(sessions), [sessions]);

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/ai/sessions/${sessionId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiSessions });
      queryClient.invalidateQueries({ queryKey: ['ai-chat-stats'] });
      if (currentSessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      toast({ title: "تم حذف المحادثة", duration: 2000 });
    },
  });

  const archiveSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/ai/sessions/${sessionId}/archive`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiSessions });
      queryClient.invalidateQueries({ queryKey: ['ai-archived-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['ai-chat-stats'] });
      if (currentSessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      toast({ title: "تم أرشفة المحادثة", duration: 2000 });
    },
  });

  const restoreSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/ai/sessions/${sessionId}/restore`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiSessions });
      queryClient.invalidateQueries({ queryKey: ['ai-archived-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['ai-chat-stats'] });
      toast({ title: "تم استعادة المحادثة", duration: 2000 });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (sessionIds: string[]) => {
      return await apiRequest("/api/ai/sessions/bulk-delete", "POST", { sessionIds });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiSessions });
      queryClient.invalidateQueries({ queryKey: ['ai-archived-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['ai-chat-stats'] });
      setSelectionMode(false); setSelectedIds(new Set());
      if (currentSessionId && selectedIds.has(currentSessionId)) { setCurrentSessionId(null); setMessages([]); }
      toast({ title: `تم حذف ${data?.deleted || selectedIds.size} محادثة`, duration: 2000 });
    },
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: async (sessionIds: string[]) => {
      return await apiRequest("/api/ai/sessions/bulk-archive", "POST", { sessionIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiSessions });
      queryClient.invalidateQueries({ queryKey: ['ai-archived-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['ai-chat-stats'] });
      setSelectionMode(false); setSelectedIds(new Set());
      toast({ title: `تم أرشفة ${selectedIds.size} محادثة`, duration: 2000 });
    },
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: async (sessionIds: string[]) => {
      return await apiRequest("/api/ai/sessions/bulk-restore", "POST", { sessionIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiSessions });
      queryClient.invalidateQueries({ queryKey: ['ai-archived-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['ai-chat-stats'] });
      setSelectionMode(false); setSelectedIds(new Set());
      toast({ title: `تم استعادة ${selectedIds.size} محادثة`, duration: 2000 });
    },
  });

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((items: any[]) => {
    setSelectedIds(new Set(items.map(s => s.id)));
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

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
    if (viewportRef.current) {
      setTimeout(() => { 
        if (viewportRef.current) viewportRef.current.scrollTop = viewportRef.current.scrollHeight; 
      }, 100);
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const deltaY = e.touches[0].clientY - startY;
      if (viewport.scrollTop <= 0 && deltaY > 0) {
        e.preventDefault();
      }
    };

    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

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
    <div className="flex flex-col h-full relative overscroll-none" dir="rtl">
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[110]"
            />
            <motion.div
              initial={{ x: 280 }}
              animate={{ x: 0 }}
              exit={{ x: 280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 bottom-0 right-0 w-72 bg-card border-l z-[120] flex flex-col shadow-xl"
            >
              <div className="p-3 border-b flex items-center justify-between">
                {sidebarView !== 'chats' ? (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSidebarView('chats'); exitSelectionMode(); }} data-testid="button-back-chats">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                ) : <div className="w-8" />}
                <h3 className="font-semibold text-sm">
                  {sidebarView === 'chats' ? 'المحادثات' : sidebarView === 'archived' ? 'الأرشيف' : 'الإعدادات'}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => { setSidebarOpen(false); setSidebarView('chats'); }} className="h-8 w-8" data-testid="button-close-sidebar">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {sidebarView === 'chats' && (
                <>
                  <div className="p-3 space-y-2">
                    {selectionMode ? (
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1 flex-1" onClick={() => { const allIds = sessions.map((s: any) => s.id); selectedIds.size === allIds.length ? setSelectedIds(new Set()) : selectAll(sessions); }} data-testid="button-select-all-chats">
                          <CheckSquare className="h-3 w-3" /> {selectedIds.size === sessions.length ? 'إلغاء الكل' : 'تحديد الكل'}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-[11px]" onClick={exitSelectionMode} data-testid="button-exit-selection">إلغاء</Button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <Button onClick={() => { startNewChat(); setSidebarOpen(false); }} variant="outline" className="flex-1 gap-2 h-9 text-sm" data-testid="button-new-chat-sidebar">
                          <Plus className="h-3.5 w-3.5" /> محادثة جديدة
                        </Button>
                        {sessions.length > 0 && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => { setSelectionMode(true); setSelectedIds(new Set()); }} data-testid="button-enter-selection">
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <ScrollArea className="flex-1 px-3">
                    <div className="pb-4">
                      {sessions.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">لا توجد محادثات سابقة</p>
                      ) : groupedSessions.map((group) => (
                        <div key={group.label}>
                          <p className="text-[10px] font-semibold text-muted-foreground px-2 pt-3 pb-1.5">{group.label}</p>
                          {group.items.map((session: any) => (
                            selectionMode ? (
                              <div key={session.id} className={`flex items-center gap-2 p-2.5 rounded-lg mb-1 cursor-pointer transition-colors ${selectedIds.has(session.id) ? 'bg-primary/10' : 'bg-card hover:bg-muted'}`} onClick={() => toggleSelection(session.id)} data-testid={`select-session-${session.id}`}>
                                {selectedIds.has(session.id) ? <CheckSquare className="h-4 w-4 text-primary shrink-0" /> : <Square className="h-4 w-4 text-muted-foreground shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <span className="truncate block text-sm">{session.title}</span>
                                  <span className="text-[10px] text-muted-foreground">{formatRelativeTime(session.lastMessageAt || session.updated_at || session.created_at)}</span>
                                </div>
                              </div>
                            ) : (
                              <SwipeableSessionItem
                                key={session.id}
                                session={session}
                                isActive={currentSessionId === session.id}
                                onSelect={() => handleSessionClick(session.id)}
                                onDelete={() => deleteSessionMutation.mutate(session.id)}
                                onArchive={() => archiveSessionMutation.mutate(session.id)}
                              />
                            )
                          ))}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {selectionMode && selectedIds.size > 0 && (
                    <div className="border-t p-2 flex gap-1.5">
                      <Button variant="destructive" size="sm" className="flex-1 h-9 text-xs gap-1" disabled={bulkDeleteMutation.isPending} onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))} data-testid="button-bulk-delete">
                        <Trash2 className="h-3.5 w-3.5" /> حذف ({selectedIds.size})
                      </Button>
                      <Button size="sm" className="flex-1 h-9 text-xs gap-1 bg-blue-500 hover:bg-blue-600 text-white" disabled={bulkArchiveMutation.isPending} onClick={() => bulkArchiveMutation.mutate(Array.from(selectedIds))} data-testid="button-bulk-archive">
                        <Archive className="h-3.5 w-3.5" /> أرشفة ({selectedIds.size})
                      </Button>
                    </div>
                  )}
                  {!selectionMode && (
                    <div className="border-t p-2 flex gap-1">
                      <Button variant="ghost" size="sm" className="flex-1 h-9 text-xs gap-1.5" onClick={() => { setSidebarView('archived'); exitSelectionMode(); }} data-testid="button-view-archived">
                        <Archive className="h-3.5 w-3.5" /> الأرشيف
                        {archivedSessions.length > 0 && <span className="bg-muted rounded-full px-1.5 text-[10px]">{archivedSessions.length}</span>}
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 h-9 text-xs gap-1.5" onClick={() => setSidebarView('settings')} data-testid="button-view-settings">
                        <Settings className="h-3.5 w-3.5" /> الإعدادات
                      </Button>
                    </div>
                  )}
                </>
              )}

              {sidebarView === 'archived' && (
                <>
                  {archivedSessions.length > 0 && (
                    <div className="px-3 pt-2 pb-1">
                      {selectionMode ? (
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1 flex-1" onClick={() => { selectedIds.size === archivedSessions.length ? setSelectedIds(new Set()) : selectAll(archivedSessions); }} data-testid="button-select-all-archived">
                            <CheckSquare className="h-3 w-3" /> {selectedIds.size === archivedSessions.length ? 'إلغاء الكل' : 'تحديد الكل'}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-[11px]" onClick={exitSelectionMode}>إلغاء</Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-1 w-full" onClick={() => { setSelectionMode(true); setSelectedIds(new Set()); }} data-testid="button-enter-archive-selection">
                          <CheckSquare className="h-3.5 w-3.5" /> تحديد متعدد
                        </Button>
                      )}
                    </div>
                  )}
                  <ScrollArea className="flex-1 px-3 pt-1">
                    <div className="space-y-1 pb-4">
                      {archivedSessions.length === 0 ? (
                        <div className="text-center py-12">
                          <Archive className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                          <p className="text-xs text-muted-foreground">لا توجد محادثات مؤرشفة</p>
                        </div>
                      ) : archivedSessions.map((session: any) => (
                        <div key={session.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg text-sm cursor-pointer transition-colors ${selectionMode && selectedIds.has(session.id) ? 'bg-primary/10' : 'bg-muted/30'}`} onClick={selectionMode ? () => toggleSelection(session.id) : undefined} data-testid={`archived-session-${session.id}`}>
                          {selectionMode ? (
                            selectedIds.has(session.id) ? <CheckSquare className="h-4 w-4 text-primary shrink-0" /> : <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <Archive className="h-3.5 w-3.5 shrink-0 opacity-40 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="truncate block text-sm text-muted-foreground">{session.title}</span>
                            <span className="text-[10px] text-muted-foreground/60">{formatRelativeTime(session.updated_at || session.created_at)}</span>
                          </div>
                          {!selectionMode && (
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => restoreSessionMutation.mutate(session.id)} data-testid={`button-restore-${session.id}`}>
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSessionMutation.mutate(session.id)} data-testid={`button-delete-archived-${session.id}`}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {selectionMode && selectedIds.size > 0 && (
                    <div className="border-t p-2 flex gap-1.5">
                      <Button variant="destructive" size="sm" className="flex-1 h-9 text-xs gap-1" disabled={bulkDeleteMutation.isPending} onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))} data-testid="button-bulk-delete-archived">
                        <Trash2 className="h-3.5 w-3.5" /> حذف ({selectedIds.size})
                      </Button>
                      <Button size="sm" className="flex-1 h-9 text-xs gap-1 bg-green-500 hover:bg-green-600 text-white" disabled={bulkRestoreMutation.isPending} onClick={() => bulkRestoreMutation.mutate(Array.from(selectedIds))} data-testid="button-bulk-restore">
                        <RotateCcw className="h-3.5 w-3.5" /> استعادة ({selectedIds.size})
                      </Button>
                    </div>
                  )}
                </>
              )}

              {sidebarView === 'settings' && (
                <div className="flex-1 p-4 space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground">إحصائيات الدردشة</h4>
                    {statsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "إجمالي المحادثات", value: chatStats?.totalSessions ?? "-", icon: MessageSquare },
                          { label: "النشطة", value: chatStats?.activeSessions ?? "-", icon: Sparkles },
                          { label: "المؤرشفة", value: chatStats?.archivedSessions ?? "-", icon: Archive },
                          { label: "الرسائل", value: chatStats?.totalMessages ?? "-", icon: Send },
                        ].map((stat) => (
                          <div key={stat.label} className="bg-muted/50 rounded-xl p-3 text-center">
                            <stat.icon className="h-4 w-4 mx-auto mb-1.5 text-primary/60" />
                            <div className="text-xl font-bold">{stat.value}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">طريقة الاستخدام</h4>
                    <div className="text-[11px] text-muted-foreground space-y-2">
                      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 p-2 rounded-lg">
                        <Trash2 className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <span>اسحب لليمين → للحذف</span>
                      </div>
                      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 p-2 rounded-lg">
                        <Archive className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span>اسحب لليسار ← للأرشفة</span>
                      </div>
                      <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>اضغط مطولاً لعرض الخيارات</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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

      <ScrollArea ref={scrollAreaRef} className="flex-1" viewportRef={viewportRef} viewportClassName="overscroll-y-contain">
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
                      <div className={`inline-block max-w-[calc(100%-1rem)] sm:max-w-full rounded-2xl px-4 py-3 overflow-hidden ${
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
                          <p className="text-sm whitespace-pre-wrap leading-relaxed break-words" style={{ overflowWrap: 'anywhere' }} data-testid={`text-message-${index}`}>{message.content}</p>
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
                          {(tableData || (message.content && message.content.length > 100)) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              title="تصدير PDF"
                              onClick={() => generatePrintPDF(message.content, tableData, "تقرير الوكيل الذكي")}
                              data-testid={`button-export-pdf-${index}`}
                            >
                              <FileDown className="h-3 w-3" />
                            </Button>
                          )}
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

      <div className="border-t bg-card/80 backdrop-blur-sm px-3 pt-2 pb-[calc(72px+env(safe-area-inset-bottom,0px)+8px)] md:pb-3 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-muted/50 border rounded-2xl p-1.5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
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
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            المساعد الذكي قد يرتكب أخطاء. تحقق من المعلومات المهمة.
          </p>
        </div>
      </div>
    </div>
  );
}
