import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Play,
  Square,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
  Package,
  GitBranch,
  Rocket,
  Terminal,
  ChevronRight,
  Activity,
  Smartphone,
  Loader2,
  TrendingUp,
  Hash,
  Timer,
  XCircle,
  RefreshCw,
  Circle,
  HeartPulse,
  RotateCcw,
  Trash2,
  Shield,
  Ban,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/error-utils";
import { apiRequest } from "@/lib/queryClient";
import { ENV } from "@/lib/env";

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "error" | "success" | "warn" | "step";
}

interface StepEntry {
  name: string;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  duration?: number;
  startedAt?: string;
}

interface Deployment {
  id: string;
  buildNumber: number;
  status: string;
  currentStep: string;
  progress: number;
  version: string;
  appType: string;
  environment: string;
  branch: string;
  commitHash?: string;
  commitMessage?: string;
  pipeline: string;
  errorMessage?: string;
  artifactUrl?: string;
  artifactSize?: string;
  logs: LogEntry[];
  steps: StepEntry[];
  duration?: number;
  startTime: string;
  endTime?: string;
  created_at: string;
}

interface DeploymentStats {
  total: number;
  success: number;
  failed: number;
  running: number;
  successRate: number;
  avgDuration: number;
}

const PIPELINE_LABELS: Record<string, string> = {
  "git-push": "نشر عبر Git (دفع + سحب + بناء)",
  "hotfix": "إصلاح سريع (نشر فوري)",
  "android-build": "بناء تطبيق أندرويد APK",
  "git-android-build": "Git + بناء أندرويد (دفع + سحب + بناء APK)",
  "android-build-test": "بناء أندرويد + اختبار Firebase",
  "web-deploy": "نشر الويب (نقل مباشر)",
  "full-deploy": "نشر كامل (ويب + أندرويد)",
};

const PIPELINE_LABELS_FULL: Record<string, string> = {
  ...PIPELINE_LABELS,
  "health-check": "فحص السلامة",
  "cleanup": "تنظيف السيرفر",
};

const STEP_LABELS: Record<string, string> = {
  "validate": "التحقق",
  "build-web": "بناء الويب",
  "health-check": "فحص السلامة",
  "cleanup": "تنظيف السيرفر",
  "transfer": "النقل",
  "deploy-server": "نشر على السيرفر",
  "restart-pm2": "إعادة تشغيل PM2",
  "sync-capacitor": "مزامنة Capacitor + Plugins",
  "gradle-build": "بناء Gradle",
  "sign-apk": "توقيع APK",
  "retrieve-artifact": "استرجاع الملفات",
  "verify": "التحقق النهائي",
  "git-push": "دفع Git",
  "pull-server": "سحب من السيرفر",
  "install-deps": "تثبيت التبعيات",
  "build-server": "بناء السيرفر",
  "rollback-server": "التراجع",
  "db-migrate": "تهجير قاعدة البيانات",
  "hotfix-sync": "مزامنة الإصلاح السريع",
  "firebase-test": "اختبار Firebase Test Lab",
  "generate-icons": "توليد الأيقونات",
  "sync-version": "مزامنة الإصدار",
};

const STEP_ICONS: Record<string, any> = {
  validate: CheckCircle2,
  "health-check": HeartPulse,
  "cleanup": Trash2,
  "build-web": Package,
  transfer: Server,
  "deploy-server": Rocket,
  "restart-pm2": RefreshCw,
  "sync-capacitor": Smartphone,
  "gradle-build": Terminal,
  "sign-apk": CheckCircle2,
  "retrieve-artifact": Package,
  verify: Activity,
  "git-push": GitBranch,
  "pull-server": Server,
  "install-deps": Package,
  "build-server": Terminal,
  "rollback-server": RotateCcw,
  "db-migrate": Server,
  "hotfix-sync": Rocket,
  "generate-icons": Smartphone,
  "firebase-test": Shield,
  "sync-version": RefreshCw,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  running: "جاري التنفيذ",
  success: "ناجح",
  failed: "فشل",
  cancelled: "ملغي",
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { color: string; icon: any; label: string }> = {
    pending: { color: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20", icon: Clock, label: STATUS_LABELS.pending },
    running: { color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", icon: Loader2, label: STATUS_LABELS.running },
    success: { color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: CheckCircle2, label: STATUS_LABELS.success },
    failed: { color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", icon: XCircle, label: STATUS_LABELS.failed },
    cancelled: { color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: Ban, label: STATUS_LABELS.cancelled },
  };
  const v = variants[status] || variants.pending;
  const Icon = v.icon;
  return (
    <Badge data-testid={`badge-status-${status}`} className={`${v.color} border font-medium gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs`}>
      <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
      {v.label}
    </Badge>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}ث`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}د ${rs}ث`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function DeploymentConsole() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const [selectedPipeline, setSelectedPipeline] = useState<string>("git-push");
  const [buildTarget, setBuildTarget] = useState<string>("server");
  const [commitMessage, setCommitMessage] = useState("");
  const [versionInput, setVersionInput] = useState("");
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null);
  const [liveDeployment, setLiveDeployment] = useState<Deployment | null>(null);
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [healthData, setHealthData] = useState<{ status: string; checks: Record<string, any> } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const hasAutoResumedRef = useRef<string | null>(null);

  const { data: statsData } = useQuery<DeploymentStats>({
    queryKey: ["/api/deployment/stats"],
    refetchInterval: 30000,
  });

  const { data: historyData, refetch: refetchHistory } = useQuery<{ deployments: Deployment[]; total: number }>({
    queryKey: ["/api/deployment/list"],
  });

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseConnectedRef = useRef(false);
  const pollRetryCountRef = useRef(0);
  const MAX_POLL_RETRIES = 5;

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollRetryCountRef.current = 0;
  }, []);

  const startPolling = useCallback((deploymentId: string) => {
    stopPolling();
    
    const poll = async () => {
      try {
        const data = await apiRequest(`/api/deployment/${deploymentId}`);
        pollRetryCountRef.current = 0;
        setLiveDeployment(data);
        setLiveLogs(Array.isArray(data.logs) ? data.logs : []);
        const isTerminal = data.status === "success" || data.status === "failed" || data.status === "cancelled";
        if (isTerminal) {
          stopPolling();
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            sseConnectedRef.current = false;
          }
          refetchHistory();
          queryClient.invalidateQueries({ queryKey: ["/api/deployment/stats"] });
        }
      } catch {
        pollRetryCountRef.current++;
        if (pollRetryCountRef.current >= MAX_POLL_RETRIES) {
          stopPolling();
        }
      }
    };

    poll();
    const POLL_INTERVAL = sseConnectedRef.current ? 5000 : 2000;
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL);
  }, [refetchHistory, queryClient, stopPolling]);

  const sseRetryCountRef = useRef(0);
  const MAX_SSE_RETRIES = 3;

  const connectSSE = useCallback((deploymentId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    sseConnectedRef.current = false;

    const apiBase = ENV.getApiBaseUrl();
    
    try {
      const es = new EventSource(`${apiBase}/api/deployment/${deploymentId}/stream`, { withCredentials: true });
      eventSourceRef.current = es;

      es.onopen = () => {
        sseConnectedRef.current = true;
        sseRetryCountRef.current = 0;
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === "initial_state") {
            setLiveDeployment(payload.data);
            setLiveLogs(Array.isArray(payload.data.logs) ? payload.data.logs : []);
            if (payload.data.status !== "running") {
              es.close();
              eventSourceRef.current = null;
              sseConnectedRef.current = false;
              stopPolling();
            }
          } else if (payload.type === "log") {
            setLiveLogs(prev => [...prev, payload.data]);
          } else if (payload.type === "deployment_update") {
            setLiveDeployment(prev => prev ? { ...prev, ...payload.data } : null);

            if (payload.data.status === "success" || payload.data.status === "failed" || payload.data.status === "cancelled") {
              es.close();
              eventSourceRef.current = null;
              sseConnectedRef.current = false;
              stopPolling();
              refetchHistory();
              queryClient.invalidateQueries({ queryKey: ["/api/deployment/stats"] });
            }
          } else if (payload.type === "step_update") {
            setLiveDeployment(prev => {
              if (!prev) return null;
              const steps = (prev.steps as StepEntry[]).map(s =>
                s.name === payload.data.stepName
                  ? { ...s, status: payload.data.status, duration: payload.data.duration }
                  : s
              );
              return { ...prev, steps };
            });
          }
        } catch { /* malformed SSE data */ }
      };

      es.onerror = () => {
        sseConnectedRef.current = false;
        es.close();
        eventSourceRef.current = null;
        sseRetryCountRef.current++;
        if (sseRetryCountRef.current < MAX_SSE_RETRIES) {
          startPolling(deploymentId);
        } else {
          stopPolling();
        }
      };
    } catch {
      sseRetryCountRef.current++;
      if (sseRetryCountRef.current < MAX_SSE_RETRIES) {
        startPolling(deploymentId);
      }
    }
  }, [refetchHistory, queryClient, startPolling, stopPolling]);

  useEffect(() => {
    const syntheticIds = ["health-check", "cleanup"];
    if (activeDeploymentId && !syntheticIds.includes(activeDeploymentId)) {
      const isLiveDeploymentRunning = liveDeployment?.status === "running";
      if (isLiveDeploymentRunning || !liveDeployment) {
        connectSSE(activeDeploymentId);
        startPolling(activeDeploymentId);
      }
    }
    return () => {
      eventSourceRef.current?.close();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [activeDeploymentId]);

  useEffect(() => {
    if (!activeDeploymentId && historyData?.deployments) {
      const running = historyData.deployments.find(d => d.status === "running");
      if (running) {
        if (!hasAutoResumedRef.current || running.id !== hasAutoResumedRef.current) {
          hasAutoResumedRef.current = running.id;
          setActiveDeploymentId(running.id);
          setLiveDeployment(running);
          setLiveLogs(Array.isArray(running.logs) ? running.logs : []);
        }
      } else {
        hasAutoResumedRef.current = null;
      }
    }
  }, [historyData, activeDeploymentId]);

  useEffect(() => {
    if (!userScrolledUp.current && logsContainerRef.current) {
      const viewport = logsContainerRef.current.closest('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [liveLogs]);

  const handleStartDeployment = async () => {
    setIsStarting(true);
    try {
      const data = await apiRequest("/api/deployment/start", "POST", {
        pipeline: selectedPipeline,
        commitMessage: commitMessage || undefined,
        version: versionInput.trim() || undefined,
        buildTarget,
      });

      if (!data?.id) {
        throw new Error("لم يتم إرجاع معرّف العملية من الخادم");
      }

      setLiveLogs([]);
      userScrolledUp.current = false;

      try {
        const fresh = await apiRequest(`/api/deployment/${data.id}`);
        setLiveDeployment(fresh);
        setLiveLogs(Array.isArray(fresh.logs) ? fresh.logs : []);
      } catch {
        setLiveDeployment(null);
      }

      setActiveDeploymentId(data.id);
      startPolling(data.id);

      toast({ title: "بدأ النشر", description: `المسار: ${PIPELINE_LABELS[selectedPipeline]}` });

      refetchHistory();
    } catch (error: any) {
      toast({ title: "فشل بدء النشر", description: toUserMessage(error), variant: "destructive" });
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancelDeployment = async () => {
    if (!activeDeploymentId) return;
    try {
      await apiRequest(`/api/deployment/${activeDeploymentId}/cancel`, "POST");
      toast({ title: "تم إلغاء النشر" });
    } catch (error: any) {
      toast({ title: "فشل الإلغاء", description: toUserMessage(error), variant: "destructive" });
    }
  };

  const handleCheckHealth = async () => {
    setIsCheckingHealth(true);
    const now = () => new Date().toISOString();
    const logs: LogEntry[] = [];
    const addLocalLog = (message: string, type: LogEntry["type"] = "info") => {
      logs.push({ timestamp: now(), message, type });
      setLiveLogs([...logs]);
    };

    setLiveDeployment({
      id: "health-check", buildNumber: 0, status: "running", currentStep: "health-check",
      progress: 50, version: "", appType: "web", environment: "production", branch: "main",
      pipeline: "health-check", logs: [], steps: [
        { name: "health-check", status: "running" }
      ], startTime: now(), created_at: now(),
    } as Deployment);
    setActiveDeploymentId("health-check");

    addLocalLog("بدء فحص سلامة السيرفر...", "step");
    try {
      const data = await apiRequest("/api/deployment/health");
      setHealthData(data);
      const isHealthy = data.status === "healthy";
      addLocalLog(`حالة السيرفر: ${isHealthy ? "سليم" : "متدهور"}`, isHealthy ? "success" : "warn");
      addLocalLog(`HTTP Status: ${data.checks?.httpStatus || "غير معروف"}`, "info");
      if (data.checks?.pm2) {
        addLocalLog(`PM2: ${JSON.stringify(data.checks.pm2)}`, "info");
      }
      if (data.checks?.disk) {
        addLocalLog(`القرص: ${data.checks.disk}`, "info");
      }
      if (data.checks?.memory) {
        addLocalLog(`الذاكرة: ${data.checks.memory}`, "info");
      }
      addLocalLog("اكتمل فحص السلامة", "success");
      setLiveDeployment(prev => prev ? { ...prev, status: "success", progress: 100, currentStep: "complete",
        steps: [{ name: "health-check", status: "success" }] } : null);
    } catch (error: any) {
      addLocalLog(`فشل فحص السلامة: ${toUserMessage(error)}`, "error");
      setLiveDeployment(prev => prev ? { ...prev, status: "failed", progress: 100, currentStep: "complete",
        steps: [{ name: "health-check", status: "failed" }] } : null);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleRollback = async (id: string) => {
    try {
      const data = await apiRequest(`/api/deployment/${id}/rollback`, "POST");
      setActiveDeploymentId(data.id);
      setLiveLogs([]);
      setLiveDeployment(null);
      toast({ title: "بدأ التراجع" });
    } catch (error: any) {
      toast({ title: "فشل التراجع", description: toUserMessage(error), variant: "destructive" });
    }
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    const now = () => new Date().toISOString();
    const logs: LogEntry[] = [];
    const addLocalLog = (message: string, type: LogEntry["type"] = "info") => {
      logs.push({ timestamp: now(), message, type });
      setLiveLogs([...logs]);
    };

    setLiveDeployment({
      id: "cleanup", buildNumber: 0, status: "running", currentStep: "cleanup",
      progress: 50, version: "", appType: "web", environment: "production", branch: "main",
      pipeline: "cleanup", logs: [], steps: [
        { name: "cleanup", status: "running" }
      ], startTime: now(), created_at: now(),
    } as Deployment);
    setActiveDeploymentId("cleanup");

    addLocalLog("بدء تنظيف السيرفر...", "step");
    try {
      const data = await apiRequest("/api/deployment/cleanup", "POST");
      if (data.cleaned?.length > 0) {
        data.cleaned.forEach((item: string) => addLocalLog(`تم تنظيف: ${item}`, "success"));
      } else {
        addLocalLog("لا يوجد شيء يحتاج تنظيف", "info");
      }
      if (data.errors?.length > 0) {
        data.errors.forEach((err: string) => addLocalLog(`خطأ: ${err}`, "error"));
      }
      addLocalLog("اكتمل التنظيف", "success");
      setLiveDeployment(prev => prev ? { ...prev, status: "success", progress: 100, currentStep: "complete",
        steps: [{ name: "cleanup", status: "success" }] } : null);
    } catch (error: any) {
      addLocalLog(`فشل التنظيف: ${toUserMessage(error)}`, "error");
      setLiveDeployment(prev => prev ? { ...prev, status: "failed", progress: 100, currentStep: "complete",
        steps: [{ name: "cleanup", status: "failed" }] } : null);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleDeleteDeployment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل تريد حذف هذه العملية؟")) return;
    try {
      await apiRequest(`/api/deployment/${id}`, "DELETE");
      toast({ title: "تم حذف العملية بنجاح" });
      if (activeDeploymentId === id) {
        setActiveDeploymentId(null);
        setLiveDeployment(null);
        setLiveLogs([]);
      }
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ["/api/deployment/stats"] });
    } catch (error: any) {
      toast({ title: "فشل الحذف", description: toUserMessage(error), variant: "destructive" });
    }
  };

  const viewDeployment = async (id: string) => {
    try {
      const data = await apiRequest(`/api/deployment/${id}`);
      if (!data) {
        toast({ title: "فشل تحميل بيانات العملية", description: "لم يتم العثور على العملية", variant: "destructive" });
        return;
      }
      setActiveDeploymentId(id);
      setLiveDeployment(data);
      setLiveLogs(Array.isArray(data?.logs) ? data.logs : []);
      userScrolledUp.current = false;
      
      if (data.status === "running") {
        connectSSE(id);
      } else {
        stopPolling();
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        sseConnectedRef.current = false;
      }
    } catch (error: any) {
      toast({ title: "فشل تحميل بيانات العملية", description: toUserMessage(error), variant: "destructive" });
    }
  };

  const stats = statsData || { total: 0, success: 0, failed: 0, running: 0, successRate: 0, avgDuration: 0 };
  const deployments = historyData?.deployments || [];
  const isRunning = liveDeployment?.status === "running";

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background text-foreground safe-area-inset-top" data-testid="deployment-console" dir="rtl">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <Card className="bg-card border-border" data-testid="card-stat-total">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-slate-500/10 flex items-center justify-center shrink-0">
                  <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-stat-total">{stats.total}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">إجمالي عمليات النشر</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border" data-testid="card-stat-success">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-stat-success-rate">{stats.successRate}%</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">نسبة النجاح</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border" data-testid="card-stat-failed">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-stat-failed">{stats.failed}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">فشل</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border" data-testid="card-stat-duration">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-stat-avg-duration">
                    {stats.avgDuration > 0 ? formatDuration(stats.avgDuration) : "—"}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">متوسط المدة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deploy Controls */}
        <Card className="bg-card border-border" data-testid="card-deploy-controls">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-foreground">
              <Rocket className="h-4 w-4 text-blue-600 dark:text-blue-400" /> نشر جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Select value={selectedPipeline} onValueChange={setSelectedPipeline} data-testid="select-pipeline">
                  <SelectTrigger className="bg-muted/50 border-border text-foreground w-full sm:w-[260px]" data-testid="trigger-pipeline">
                    <SelectValue placeholder="اختر مسار النشر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web-deploy" data-testid="option-web-deploy">نشر الويب</SelectItem>
                    <SelectItem value="android-build" data-testid="option-android-build">بناء تطبيق أندرويد APK</SelectItem>
                    <SelectItem value="full-deploy" data-testid="option-full-deploy">نشر كامل (ويب + أندرويد)</SelectItem>
                    <SelectItem value="git-push" data-testid="option-git-push">دفع Git + بناء على السيرفر</SelectItem>
                    <SelectItem value="hotfix" data-testid="option-hotfix">إصلاح سريع</SelectItem>
                    <SelectItem value="git-android-build" data-testid="option-git-android-build">Git + بناء أندرويد</SelectItem>
                    <SelectItem value="android-build-test" data-testid="option-android-build-test">بناء أندرويد + اختبار Firebase</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={buildTarget} onValueChange={setBuildTarget} data-testid="select-build-target">
                  <SelectTrigger className="bg-muted/50 border-border text-foreground w-full sm:w-[200px]" data-testid="trigger-build-target">
                    <SelectValue placeholder="مكان البناء" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="server" data-testid="option-target-server">🖥️ بناء على السيرفر (VPS)</SelectItem>
                    <SelectItem value="local" data-testid="option-target-local">💻 بناء محلي + نقل</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  data-testid="input-commit-message"
                  placeholder="رسالة التحديث (اختياري)"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="bg-muted/50 border-border text-foreground flex-1"
                />
                <Input
                  data-testid="input-version"
                  placeholder="رقم الإصدار (مثل 3.9.2)"
                  value={versionInput}
                  onChange={(e) => setVersionInput(e.target.value)}
                  className="bg-muted/50 border-border text-foreground w-full sm:w-[160px]"
                  dir="ltr"
                />
              </div>

              {!isRunning ? (
                <Button
                  data-testid="button-start-deploy"
                  onClick={handleStartDeployment}
                  disabled={isStarting}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium gap-2 whitespace-nowrap w-full sm:w-auto sm:self-start min-h-[44px]"
                >
                  {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  نشر
                </Button>
              ) : (
                <Button
                  data-testid="button-cancel-deploy"
                  onClick={handleCancelDeployment}
                  variant="destructive"
                  className="gap-2 whitespace-nowrap w-full sm:w-auto sm:self-start min-h-[44px]"
                >
                  <Square className="h-4 w-4" /> إلغاء
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Operations Panel */}
        <Card className="bg-card border-border" data-testid="card-operations">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-foreground">
              <Shield className="h-4 w-4 text-cyan-600 dark:text-cyan-400" /> عمليات السيرفر
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
              <div className="flex gap-2">
                <Button
                  data-testid="button-health-check"
                  onClick={handleCheckHealth}
                  disabled={isCheckingHealth}
                  variant="outline"
                  className="border-cyan-600/40 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/10 gap-2 flex-1 sm:flex-none min-h-[44px]"
                >
                  {isCheckingHealth ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />}
                  <span className="text-xs sm:text-sm">فحص السلامة</span>
                </Button>
                <Button
                  data-testid="button-cleanup"
                  onClick={handleCleanup}
                  disabled={isCleaning}
                  variant="outline"
                  className="border-amber-600/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 gap-2 flex-1 sm:flex-none min-h-[44px]"
                >
                  {isCleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span className="text-xs sm:text-sm">تنظيف السيرفر</span>
                </Button>
              </div>
              {healthData && (
                <div className="flex items-center gap-2 sm:mr-auto">
                  <div className={`h-2.5 w-2.5 rounded-full ${healthData.status === "healthy" ? "bg-emerald-500 dark:bg-emerald-400" : "bg-amber-500 dark:bg-amber-400"} animate-pulse`} />
                  <span className={`text-sm font-medium ${healthData.status === "healthy" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`} data-testid="text-health-status">
                    {healthData.status === "healthy" ? "سليم" : "متدهور"}
                  </span>
                  <span className="text-xs text-muted-foreground" data-testid="text-health-http">
                    HTTP {healthData.checks?.httpStatus || "—"}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">

          {/* Pipeline Steps */}
          <Card className="bg-card border-border lg:col-span-1" data-testid="card-pipeline-steps">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-foreground">
                <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" /> مراحل التنفيذ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 sm:space-y-1.5 px-3 sm:px-6 pb-3 sm:pb-6">
              {liveDeployment ? (
                <>
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <StatusBadge status={liveDeployment.status} />
                    <span className="text-xs text-muted-foreground font-mono">#{liveDeployment.buildNumber}</span>
                  </div>
                  <Progress value={liveDeployment.progress} className="h-1.5 mb-2 sm:mb-3" />

                  {(liveDeployment.steps as StepEntry[]).map((step, i) => {
                    const StepIcon = STEP_ICONS[step.name] || Circle;
                    const isActive = step.status === "running";
                    const isDone = step.status === "success";
                    const isFailed = step.status === "failed";
                    const isCancelled = step.status === "cancelled";

                    return (
                      <div
                        key={step.name}
                        data-testid={`step-${step.name}`}
                        className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all ${
                          isActive ? "bg-blue-500/10 border border-blue-500/20" :
                          isDone ? "bg-emerald-500/5 border border-transparent" :
                          isFailed ? "bg-red-500/10 border border-red-500/20" :
                          isCancelled ? "bg-amber-500/5 border border-amber-500/15 opacity-60" :
                          "bg-transparent border border-transparent opacity-50"
                        }`}
                      >
                        <div className={`h-6 w-6 sm:h-7 sm:w-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive ? "bg-blue-500/20" : isDone ? "bg-emerald-500/15" : isFailed ? "bg-red-500/15" : isCancelled ? "bg-amber-500/10" : "bg-muted"
                        }`}>
                          {isActive ? (
                            <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
                          ) : isDone ? (
                            <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : isFailed ? (
                            <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-600 dark:text-red-400" />
                          ) : isCancelled ? (
                            <Ban className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <StepIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm font-medium truncate ${
                            isActive ? "text-blue-700 dark:text-blue-300" : isDone ? "text-emerald-700 dark:text-emerald-300" : isFailed ? "text-red-700 dark:text-red-300" : isCancelled ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                          }`}>
                            {STEP_LABELS[step.name] || step.name.replace(/-/g, " ")}
                          </p>
                        </div>
                        {step.duration && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground font-mono shrink-0">
                            {formatDuration(step.duration)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Rocket className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs sm:text-sm">اختر عملية نشر أو ابدأ واحدة جديدة</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Logs */}
          <Card className="bg-card border-border lg:col-span-2" data-testid="card-live-logs">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-foreground">
                  <Terminal className="h-4 w-4 text-green-600 dark:text-green-400" /> سجل البناء
                  {isRunning && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                </CardTitle>
                <span className="text-[10px] sm:text-xs text-muted-foreground">{liveLogs.length} سطر</span>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <ScrollArea className="h-[250px] sm:h-[350px] lg:h-[420px] rounded-lg bg-gray-950 border border-gray-800" dir="ltr"
                onScrollCapture={(e) => {
                  const el = e.currentTarget.querySelector('[data-radix-scroll-area-viewport]');
                  if (el) {
                    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
                    userScrolledUp.current = !atBottom;
                  }
                }}
              >
                <div ref={logsContainerRef} className="p-2 sm:p-3 font-mono text-[10px] sm:text-xs space-y-0.5">
                  {liveLogs.length > 0 ? (
                    liveLogs.map((log, i) => {
                      const color =
                        log.type === "error" ? "text-red-400" :
                        log.type === "success" ? "text-emerald-400" :
                        log.type === "warn" ? "text-amber-400" :
                        log.type === "step" ? "text-blue-400 font-semibold" :
                        "text-gray-400";

                      return (
                        <div key={i} className={`flex gap-1 sm:gap-2 py-0.5 ${color}`} data-testid={`log-entry-${i}`}>
                          <span className="text-gray-600 shrink-0 select-none w-[50px] sm:w-[65px] text-right hidden xs:inline">
                            {formatTime(log.timestamp)}
                          </span>
                          <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 opacity-40 hidden sm:block" />
                          <span className="break-all">{log.message}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 py-12 sm:py-20">
                      <div className="text-center">
                        <Terminal className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-[10px] sm:text-xs">في انتظار مخرجات البناء...</p>
                      </div>
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Deployment History */}
        <Card className="bg-card border-border" data-testid="card-deployment-history">
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" /> سجل عمليات النشر
              </CardTitle>
              <Button
                data-testid="button-refresh-history"
                variant="ghost"
                size="sm"
                onClick={() => refetchHistory()}
                className="text-muted-foreground hover:text-foreground gap-1 sm:gap-1.5 text-[10px] sm:text-xs min-h-[36px]"
              >
                <RefreshCw className="h-3 w-3" /> تحديث
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {deployments.length > 0 ? (
              <div className="space-y-2">
                {deployments.map((d) => {
                  const isExpanded = expandedHistoryId === d.id;
                  const dSteps = Array.isArray(d.steps) ? d.steps as StepEntry[] : [];
                  return (
                  <div
                    key={d.id}
                    data-testid={`deployment-row-${d.buildNumber}`}
                    className={`rounded-lg transition-all text-right ${
                      activeDeploymentId === d.id ? "bg-muted/60 ring-1 ring-blue-500/30" : "bg-muted/20"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedHistoryId(isExpanded ? null : d.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedHistoryId(isExpanded ? null : d.id); } }}
                      className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-2.5 sm:p-3 hover:bg-muted/50 rounded-lg cursor-pointer"
                    >
                      <div className="flex items-center gap-2 justify-between sm:justify-start shrink-0">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90 rtl:rotate-90"}`} />
                          <span className="text-[10px] sm:text-xs font-mono text-muted-foreground">#{d.buildNumber}</span>
                          <StatusBadge status={d.status} />
                        </div>
                        <div className="flex items-center gap-1.5 sm:hidden text-[10px] text-muted-foreground">
                          {d.duration && <span className="font-mono">{formatDuration(d.duration)}</span>}
                          <span dir="ltr">{new Date(d.created_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          {d.status !== "running" && (
                            <button
                              data-testid={`button-delete-mobile-${d.buildNumber}`}
                              className="p-1 text-red-500 hover:text-red-400"
                              onClick={(e) => handleDeleteDeployment(d.id, e)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] border-border text-muted-foreground shrink-0">
                            {PIPELINE_LABELS_FULL[d.pipeline] || d.pipeline}
                          </Badge>
                          <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">v{d.version}</span>
                          {d.commitMessage && (
                            <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-none">{d.commitMessage}</span>
                          )}
                        </div>
                        {d.status === "failed" && d.errorMessage && (
                          <p className="text-[10px] text-red-500 dark:text-red-400 truncate max-w-[250px] sm:max-w-[400px] mt-0.5" data-testid={`text-error-${d.buildNumber}`}>
                            <AlertCircle className="h-3 w-3 inline-block ml-0.5" />
                            {d.errorMessage}
                          </p>
                        )}
                      </div>

                      <div className="hidden sm:flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                        {d.duration && <span className="font-mono">{formatDuration(d.duration)}</span>}
                        <span dir="ltr">{new Date(d.created_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {d.status === "success" && (
                          <Button
                            data-testid={`button-rollback-${d.buildNumber}`}
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-amber-500/10"
                            onClick={(e) => { e.stopPropagation(); handleRollback(d.id); }}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                        {d.status !== "running" && (
                          <Button
                            data-testid={`button-delete-${d.buildNumber}`}
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-500/10"
                            onClick={(e) => handleDeleteDeployment(d.id, e)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-3 sm:px-4 pb-3 border-t border-border/50 mt-1 pt-2 space-y-2" data-testid={`deployment-details-${d.buildNumber}`}>
                        <div className="flex items-center gap-2 flex-wrap text-[10px] sm:text-xs text-muted-foreground">
                          <span className="font-mono" dir="ltr">ID: {d.id.slice(0, 8)}</span>
                          <span>•</span>
                          <span>{d.environment}</span>
                          <span>•</span>
                          <span>{d.branch || "main"}</span>
                          {d.commitHash && (
                            <>
                              <span>•</span>
                              <span className="font-mono" dir="ltr">{d.commitHash.slice(0, 7)}</span>
                            </>
                          )}
                          {d.artifactSize && (
                            <>
                              <span>•</span>
                              <span>APK: {d.artifactSize}</span>
                            </>
                          )}
                        </div>

                        {dSteps.length > 0 && (
                          <div className="space-y-0.5">
                            {dSteps.map((step) => {
                              const isDone = step.status === "success";
                              const isFailed = step.status === "failed";
                              const isCancelledStep = step.status === "cancelled";
                              return (
                                <div key={step.name} className="flex items-center gap-2 py-0.5">
                                  {isDone ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                  ) : isFailed ? (
                                    <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                                  ) : isCancelledStep ? (
                                    <Ban className="h-3 w-3 text-amber-500/60 shrink-0" />
                                  ) : (
                                    <Circle className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                                  )}
                                  <span className={`text-[10px] sm:text-xs ${
                                    isDone ? "text-emerald-600 dark:text-emerald-400" :
                                    isFailed ? "text-red-600 dark:text-red-400" :
                                    isCancelledStep ? "text-amber-600/60 dark:text-amber-400/60 line-through" :
                                    "text-muted-foreground/50"
                                  }`}>
                                    {STEP_LABELS[step.name] || step.name}
                                  </span>
                                  {step.duration && (
                                    <span className="text-[9px] text-muted-foreground font-mono mr-auto" dir="ltr">
                                      {formatDuration(step.duration)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {d.status === "failed" && d.errorMessage && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2" data-testid={`error-detail-${d.buildNumber}`}>
                            <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span className="break-all">{d.errorMessage}</span>
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            data-testid={`button-view-logs-${d.buildNumber}`}
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] sm:text-xs gap-1.5"
                            onClick={(e) => { e.stopPropagation(); viewDeployment(d.id); }}
                          >
                            <Terminal className="h-3 w-3" />
                            عرض السجل الكامل
                          </Button>
                          {d.status === "success" && (
                            <Button
                              data-testid={`button-rollback-expanded-${d.buildNumber}`}
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] sm:text-xs gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              onClick={(e) => { e.stopPropagation(); handleRollback(d.id); }}
                            >
                              <RotateCcw className="h-3 w-3" />
                              تراجع
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs sm:text-sm">لا توجد عمليات نشر بعد</p>
                <p className="text-[10px] sm:text-xs mt-1">ابدأ أول عملية نشر من الأعلى</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
