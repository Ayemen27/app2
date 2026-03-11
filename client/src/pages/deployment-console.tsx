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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "error" | "success" | "warn" | "step";
}

interface StepEntry {
  name: string;
  status: "pending" | "running" | "success" | "failed";
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
  "web-deploy": "Web Deploy (Direct Transfer)",
  "android-build": "Android APK Build",
  "full-deploy": "Full Deploy (Web + Android)",
  "git-push": "Git Push & Server Pull",
};

const STEP_ICONS: Record<string, any> = {
  validate: CheckCircle2,
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
  "restart-pm2": RefreshCw,
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { color: string; icon: any; label: string }> = {
    pending: { color: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: Clock, label: "Pending" },
    running: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Loader2, label: "Running" },
    success: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2, label: "Success" },
    failed: { color: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle, label: "Failed" },
  };
  const v = variants[status] || variants.pending;
  const Icon = v.icon;
  return (
    <Badge data-testid={`badge-status-${status}`} className={`${v.color} border font-medium gap-1.5 px-2.5 py-1`}>
      <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
      {v.label}
    </Badge>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m ${rs}s`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function DeploymentConsole() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const [selectedPipeline, setSelectedPipeline] = useState<string>("web-deploy");
  const [commitMessage, setCommitMessage] = useState("");
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null);
  const [liveDeployment, setLiveDeployment] = useState<Deployment | null>(null);
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [healthData, setHealthData] = useState<{ status: string; checks: Record<string, any> } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const { data: statsData } = useQuery<DeploymentStats>({
    queryKey: ["/api/deployment/stats"],
    refetchInterval: 30000,
  });

  const { data: historyData, refetch: refetchHistory } = useQuery<{ deployments: Deployment[]; total: number }>({
    queryKey: ["/api/deployment/list"],
  });

  const connectSSE = useCallback((deploymentId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/deployment/${deploymentId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === "initial_state") {
          setLiveDeployment(payload.data);
          setLiveLogs(payload.data.logs || []);
        } else if (payload.type === "log") {
          setLiveLogs(prev => [...prev, payload.data]);
        } else if (payload.type === "deployment_update") {
          setLiveDeployment(prev => prev ? { ...prev, ...payload.data } : null);

          if (payload.data.status === "success" || payload.data.status === "failed") {
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
      } catch {}
    };

    es.onerror = () => {
      setTimeout(() => {
        if (activeDeploymentId === deploymentId) {
          connectSSE(deploymentId);
        }
      }, 3000);
    };
  }, [activeDeploymentId, refetchHistory, queryClient]);

  useEffect(() => {
    if (activeDeploymentId) {
      connectSSE(activeDeploymentId);
    }
    return () => {
      eventSourceRef.current?.close();
    };
  }, [activeDeploymentId, connectSSE]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveLogs]);

  const handleStartDeployment = async () => {
    setIsStarting(true);
    try {
      const res = await apiRequest("/api/deployment/start", "POST", {
        pipeline: selectedPipeline,
        commitMessage: commitMessage || undefined,
      });
      const data = await res.json();

      setActiveDeploymentId(data.id);
      setLiveLogs([]);
      setLiveDeployment(null);

      toast({ title: "Deployment started", description: `Pipeline: ${PIPELINE_LABELS[selectedPipeline]}` });
    } catch (error: any) {
      toast({ title: "Failed to start deployment", description: error.message, variant: "destructive" });
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancelDeployment = async () => {
    if (!activeDeploymentId) return;
    try {
      await apiRequest(`/api/deployment/${activeDeploymentId}/cancel`, "POST");
      toast({ title: "Deployment cancelled" });
    } catch (error: any) {
      toast({ title: "Failed to cancel", description: error.message, variant: "destructive" });
    }
  };

  const handleCheckHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await apiRequest("/api/deployment/health");
      const data = await res.json();
      setHealthData(data);
      toast({ title: `Server: ${data.status}`, description: `HTTP: ${data.checks?.httpStatus || "unknown"}` });
    } catch (error: any) {
      toast({ title: "Health check failed", description: error.message, variant: "destructive" });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleRollback = async (id: string) => {
    try {
      const res = await apiRequest(`/api/deployment/${id}/rollback`, "POST");
      const data = await res.json();
      setActiveDeploymentId(data.id);
      setLiveLogs([]);
      setLiveDeployment(null);
      toast({ title: "Rollback started" });
    } catch (error: any) {
      toast({ title: "Rollback failed", description: error.message, variant: "destructive" });
    }
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const res = await apiRequest("/api/deployment/cleanup", "POST");
      const data = await res.json();
      toast({
        title: "Cleanup complete",
        description: `Cleaned: ${data.cleaned?.join(", ") || "none"}${data.errors?.length ? ` | Errors: ${data.errors.length}` : ""}`,
      });
    } catch (error: any) {
      toast({ title: "Cleanup failed", description: error.message, variant: "destructive" });
    } finally {
      setIsCleaning(false);
    }
  };

  const viewDeployment = async (id: string) => {
    setActiveDeploymentId(id);
    setLiveLogs([]);
    setLiveDeployment(null);

    try {
      const res = await fetch(`/api/deployment/${id}`);
      const data = await res.json();
      setLiveDeployment(data);
      setLiveLogs(data.logs || []);
    } catch {}
  };

  const stats = statsData || { total: 0, success: 0, failed: 0, running: 0, successRate: 0, avgDuration: 0 };
  const deployments = historyData?.deployments || [];
  const isRunning = liveDeployment?.status === "running";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white" data-testid="deployment-console">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Deployment Console</h1>
              <p className="text-sm text-gray-400">AXION DevOps Pipeline Manager</p>
            </div>
          </div>
          {stats.running > 0 && (
            <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> {stats.running} active
            </Badge>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gray-900/60 border-gray-800" data-testid="card-stat-total">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-slate-500/10 flex items-center justify-center">
                  <Hash className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-total">{stats.total}</p>
                  <p className="text-xs text-gray-500">Total Deploys</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 border-gray-800" data-testid="card-stat-success">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400" data-testid="text-stat-success-rate">{stats.successRate}%</p>
                  <p className="text-xs text-gray-500">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 border-gray-800" data-testid="card-stat-failed">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400" data-testid="text-stat-failed">{stats.failed}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 border-gray-800" data-testid="card-stat-duration">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Timer className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400" data-testid="text-stat-avg-duration">
                    {stats.avgDuration > 0 ? formatDuration(stats.avgDuration) : "—"}
                  </p>
                  <p className="text-xs text-gray-500">Avg Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deploy Controls */}
        <Card className="bg-gray-900/60 border-gray-800" data-testid="card-deploy-controls">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Rocket className="h-4 w-4 text-blue-400" /> New Deployment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedPipeline} onValueChange={setSelectedPipeline} data-testid="select-pipeline">
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white w-full sm:w-[260px]" data-testid="trigger-pipeline">
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web-deploy" data-testid="option-web-deploy">Web Deploy (Direct Transfer)</SelectItem>
                  <SelectItem value="android-build" data-testid="option-android-build">Android APK Build</SelectItem>
                  <SelectItem value="full-deploy" data-testid="option-full-deploy">Full Deploy (Web + Android)</SelectItem>
                  <SelectItem value="git-push" data-testid="option-git-push">Git Push & Server Pull</SelectItem>
                  <SelectItem value="hotfix" data-testid="option-hotfix">Hotfix Deploy (Fast Push)</SelectItem>
                </SelectContent>
              </Select>

              <Input
                data-testid="input-commit-message"
                placeholder="Commit message (optional)"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="bg-gray-800/50 border-gray-700 text-white flex-1"
              />

              {!isRunning ? (
                <Button
                  data-testid="button-start-deploy"
                  onClick={handleStartDeployment}
                  disabled={isStarting}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium gap-2 whitespace-nowrap"
                >
                  {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Deploy
                </Button>
              ) : (
                <Button
                  data-testid="button-cancel-deploy"
                  onClick={handleCancelDeployment}
                  variant="destructive"
                  className="gap-2 whitespace-nowrap"
                >
                  <Square className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Operations Panel */}
        <Card className="bg-gray-900/60 border-gray-800" data-testid="card-operations">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-400" /> Server Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Button
                data-testid="button-health-check"
                onClick={handleCheckHealth}
                disabled={isCheckingHealth}
                variant="outline"
                className="border-cyan-600/40 text-cyan-400 hover:bg-cyan-500/10 gap-2"
              >
                {isCheckingHealth ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />}
                Health Check
              </Button>
              <Button
                data-testid="button-cleanup"
                onClick={handleCleanup}
                disabled={isCleaning}
                variant="outline"
                className="border-amber-600/40 text-amber-400 hover:bg-amber-500/10 gap-2"
              >
                {isCleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Cleanup Server
              </Button>
              {healthData && (
                <div className="flex items-center gap-2 ml-auto">
                  <div className={`h-2.5 w-2.5 rounded-full ${healthData.status === "healthy" ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
                  <span className={`text-sm font-medium ${healthData.status === "healthy" ? "text-emerald-400" : "text-amber-400"}`} data-testid="text-health-status">
                    {healthData.status === "healthy" ? "Healthy" : "Degraded"}
                  </span>
                  <span className="text-xs text-gray-500" data-testid="text-health-http">
                    HTTP {healthData.checks?.httpStatus || "—"}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Pipeline Steps */}
          <Card className="bg-gray-900/60 border-gray-800 lg:col-span-1" data-testid="card-pipeline-steps">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-400" /> Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {liveDeployment ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <StatusBadge status={liveDeployment.status} />
                    <span className="text-xs text-gray-500 font-mono">#{liveDeployment.buildNumber}</span>
                  </div>
                  <Progress value={liveDeployment.progress} className="h-1.5 mb-3" />

                  {(liveDeployment.steps as StepEntry[]).map((step, i) => {
                    const StepIcon = STEP_ICONS[step.name] || Circle;
                    const isActive = step.status === "running";
                    const isDone = step.status === "success";
                    const isFailed = step.status === "failed";

                    return (
                      <div
                        key={step.name}
                        data-testid={`step-${step.name}`}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                          isActive ? "bg-blue-500/10 border border-blue-500/20" :
                          isDone ? "bg-emerald-500/5 border border-transparent" :
                          isFailed ? "bg-red-500/10 border border-red-500/20" :
                          "bg-transparent border border-transparent opacity-50"
                        }`}
                      >
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive ? "bg-blue-500/20" : isDone ? "bg-emerald-500/15" : isFailed ? "bg-red-500/15" : "bg-gray-800"
                        }`}>
                          {isActive ? (
                            <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                          ) : isDone ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : isFailed ? (
                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                          ) : (
                            <StepIcon className="h-3.5 w-3.5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            isActive ? "text-blue-300" : isDone ? "text-emerald-300" : isFailed ? "text-red-300" : "text-gray-500"
                          }`}>
                            {step.name.replace(/-/g, " ")}
                          </p>
                        </div>
                        {step.duration && (
                          <span className="text-xs text-gray-500 font-mono shrink-0">
                            {formatDuration(step.duration)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Rocket className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Select a deployment or start a new one</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Logs */}
          <Card className="bg-gray-900/60 border-gray-800 lg:col-span-2" data-testid="card-live-logs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-green-400" /> Build Logs
                  {isRunning && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                </CardTitle>
                <span className="text-xs text-gray-500">{liveLogs.length} entries</span>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[420px] rounded-lg bg-gray-950/80 border border-gray-800">
                <div className="p-3 font-mono text-xs space-y-0.5">
                  {liveLogs.length > 0 ? (
                    liveLogs.map((log, i) => {
                      const color =
                        log.type === "error" ? "text-red-400" :
                        log.type === "success" ? "text-emerald-400" :
                        log.type === "warn" ? "text-amber-400" :
                        log.type === "step" ? "text-blue-400 font-semibold" :
                        "text-gray-400";

                      return (
                        <div key={i} className={`flex gap-2 py-0.5 ${color}`} data-testid={`log-entry-${i}`}>
                          <span className="text-gray-600 shrink-0 select-none w-[65px] text-right">
                            {formatTime(log.timestamp)}
                          </span>
                          <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 opacity-40" />
                          <span className="break-all">{log.message}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-600 py-20">
                      <div className="text-center">
                        <Terminal className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>Waiting for build output...</p>
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
        <Card className="bg-gray-900/60 border-gray-800" data-testid="card-deployment-history">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" /> Deployment History
              </CardTitle>
              <Button
                data-testid="button-refresh-history"
                variant="ghost"
                size="sm"
                onClick={() => refetchHistory()}
                className="text-gray-400 hover:text-white gap-1.5 text-xs"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {deployments.length > 0 ? (
              <div className="space-y-2">
                {deployments.map((d) => (
                  <button
                    key={d.id}
                    data-testid={`deployment-row-${d.buildNumber}`}
                    onClick={() => viewDeployment(d.id)}
                    className={`w-full flex items-center gap-4 p-3 rounded-lg transition-all hover:bg-gray-800/50 text-left ${
                      activeDeploymentId === d.id ? "bg-gray-800/60 ring-1 ring-blue-500/30" : "bg-gray-900/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-gray-500">#{d.buildNumber}</span>
                      <StatusBadge status={d.status} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400 shrink-0">
                          {d.pipeline}
                        </Badge>
                        <span className="text-xs text-gray-400 font-mono">v{d.version}</span>
                        {d.commitMessage && (
                          <span className="text-xs text-gray-500 truncate">{d.commitMessage}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500">
                      {d.duration && <span className="font-mono">{formatDuration(d.duration)}</span>}
                      <span>{new Date(d.created_at).toLocaleDateString()}</span>
                      {d.status === "success" && (
                        <Button
                          data-testid={`button-rollback-${d.buildNumber}`}
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                          onClick={(e) => { e.stopPropagation(); handleRollback(d.id); }}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 opacity-30" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No deployments yet</p>
                <p className="text-xs mt-1">Start your first deployment above</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
