import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Square, 
  Check, 
  AlertCircle, 
  Clock, 
  Server,
  Package,
  GitBranch,
  Zap,
  Terminal,
  ChevronRight,
  Download,
  Copy,
  RotateCcw,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BuildLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface BuildStep {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  icon: any;
  duration?: number;
}

const INITIAL_STEPS: BuildStep[] = [
  { id: 1, name: 'Initializing Project', status: 'pending', icon: GitBranch },
  { id: 2, name: 'Installing Dependencies', status: 'pending', icon: Package },
  { id: 3, name: 'Building Application', status: 'pending', icon: Zap },
  { id: 4, name: 'Optimizing Assets', status: 'pending', icon: Activity },
  { id: 5, name: 'Deploying to Server', status: 'pending', icon: Server },
  { id: 6, name: 'Finalizing', status: 'pending', icon: Check },
];

export default function DeploymentConsole() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<BuildStep[]>(INITIAL_STEPS);
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [logs, autoScroll]);

  const addLog = (message: string, type: BuildLog['type'] = 'info') => {
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString('ar-SA'),
        message,
        type,
      },
    ]);
  };

  const updateStep = (id: number, status: BuildStep['status'], duration?: number) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, status, duration } : step
    ));
  };

  const startDeployment = async () => {
    setIsRunning(true);
    setProgress(0);
    setLogs([]);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending', duration: undefined })));
    setStartTime(Date.now());
    setEndTime(null);

    addLog('🚀 بدء عملية البناء والنشر...', 'info');

    for (let i = 0; i < STEPS_LOGIC.length; i++) {
      const stepConfig = STEPS_LOGIC[i];
      updateStep(stepConfig.id, 'running');
      addLog(`[${stepConfig.name}] جاري التنفيذ...`, 'info');
      
      const stepStartTime = Date.now();
      
      try {
        await simulateStep(stepConfig);
        const duration = Math.floor((Date.now() - stepStartTime) / 1000);
        updateStep(stepConfig.id, 'success', duration);
        addLog(`✅ اكتملت مرحلة: ${stepConfig.name}`, 'success');
        setProgress(((i + 1) / STEPS_LOGIC.length) * 100);
      } catch (error) {
        updateStep(stepConfig.id, 'failed');
        addLog(`❌ فشلت العملية في مرحلة: ${stepConfig.name}`, 'error');
        addLog(`سبب محتمل: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`, 'warning');
        setIsRunning(false);
        setEndTime(Date.now());
        return;
      }
    }

    setIsRunning(false);
    setEndTime(Date.now());
    addLog('🎉 اكتملت عملية النشر بنجاح! التطبيق الآن متاح بنسخته الجديدة.', 'success');
    toast({
      title: "نجاح النشر",
      description: "تم تحديث التطبيق بنجاح.",
    });
  };

  const simulateStep = async (step: any) => {
    return new Promise((resolve, reject) => {
      const duration = step.duration || 2000;
      setTimeout(() => {
        if (Math.random() < 0.05) { // 5% failure rate for realism
          reject(new Error("Network timeout or resource unavailable"));
        } else {
          resolve(true);
        }
      }, duration);
    });
  };

  const STEPS_LOGIC = [
    { id: 1, name: 'Initializing Project', duration: 1500 },
    { id: 2, name: 'Installing Dependencies', duration: 4000 },
    { id: 3, name: 'Building Application', duration: 6000 },
    { id: 4, name: 'Optimizing Assets', duration: 3000 },
    { id: 5, name: 'Deploying to Server', duration: 5000 },
    { id: 6, name: 'Finalizing', duration: 1000 },
  ];

  const getDuration = () => {
    if (!startTime) return '00:00';
    const currentEnd = endTime || Date.now();
    const diff = Math.floor((currentEnd - startTime) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ description: "تم نسخ السجلات إلى الحافظة" });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" />
            Build & Deployment Pipeline
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            مراقبة حية لعملية البناء والنشر التلقائي (CI/CD)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyLogs}
            className="hover-elevate"
          >
            <Copy className="w-4 h-4 ml-2" />
            Copy Logs
          </Button>
          {!isRunning ? (
            <Button 
              onClick={startDeployment} 
              className="bg-primary hover-elevate active-elevate-2 px-8"
              size="lg"
            >
              <Play className="w-4 h-4 ml-2" />
              Deploy Now
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              onClick={() => setIsRunning(false)}
              className="hover-elevate"
            >
              <Square className="w-4 h-4 ml-2" />
              Stop Build
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Progress & Steps Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Pipeline Steps</span>
                <Badge variant={isRunning ? "secondary" : "outline"} className="animate-pulse">
                  {isRunning ? "Running" : "Idle"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-1">
              {steps.map((step, idx) => (
                <div key={step.id} className="relative pl-6 pb-6 last:pb-0">
                  {idx !== steps.length - 1 && (
                    <div className={`absolute left-[11px] top-6 bottom-0 w-[2px] ${
                      step.status === 'success' ? 'bg-primary' : 'bg-border'
                    }`} />
                  )}
                  <div className="flex items-start gap-4">
                    <div className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors ${
                      step.status === 'success' ? 'bg-primary text-primary-foreground' :
                      step.status === 'running' ? 'bg-primary/20 text-primary animate-pulse border-2 border-primary' :
                      step.status === 'failed' ? 'bg-destructive text-destructive-foreground' :
                      'bg-muted text-muted-foreground border-2 border-border'
                    }`}>
                      {step.status === 'success' ? <Check className="w-3 h-3" /> : 
                       step.status === 'failed' ? <AlertCircle className="w-3 h-3" /> :
                       <step.icon className="w-3 h-3" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${
                        step.status === 'running' ? 'text-primary' : 'text-foreground'
                      }`}>
                        {step.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {step.status === 'running' && (
                          <span className="text-[10px] text-primary animate-pulse uppercase font-bold">In Progress</span>
                        )}
                        {step.duration && (
                          <span className="text-[10px] text-muted-foreground font-mono">{step.duration}s</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Total Duration</p>
                  <p className="text-3xl font-mono font-bold text-primary">{getDuration()}</p>
                </div>
                <Clock className="w-10 h-10 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Console / Logs Column */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-border/50 shadow-sm h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-black/5 dark:bg-white/5 rounded-md border">
                  <Terminal className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Console Output</span>
                </div>
                {isRunning && <Badge className="bg-primary animate-pulse text-[10px]">LIVE UPDATES</Badge>}
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded border-border"
                  />
                  Auto-scroll
                </label>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 bg-[#0d1117] min-h-[600px] flex-1">
              <ScrollArea className="h-full">
                <div className="p-6 font-mono text-sm leading-relaxed space-y-1">
                  {logs.length === 0 ? (
                    <div className="text-muted-foreground/30 italic flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      Ready for deployment...
                    </div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={log.id} className="group flex gap-4 hover:bg-white/5 py-0.5 rounded px-2 -mx-2 transition-colors">
                        <span className="text-gray-600 select-none w-12 text-right text-[10px] pt-1">{i + 1}</span>
                        <span className="text-gray-500 select-none w-20 pt-1 text-[11px]">{log.timestamp}</span>
                        <span className={`flex-1 break-all ${
                          log.type === 'success' ? 'text-emerald-400 font-medium' :
                          log.type === 'error' ? 'text-rose-400 font-bold' :
                          log.type === 'warning' ? 'text-amber-400' :
                          'text-slate-300'
                        }`}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={scrollRef} className="h-2" />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Real-time Metrics or Success Actions */}
          {progress === 100 && !isRunning && (
            <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 animate-in fade-in slide-in-from-bottom-4">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-emerald-700 dark:text-emerald-400">
                  <div className="bg-emerald-500 text-white p-3 rounded-full shadow-lg shadow-emerald-500/20">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">نشر ناجح!</h3>
                    <p className="text-sm opacity-90">تم تحديث نسخة الإنتاج بنجاح وتجاوزت جميع الاختبارات.</p>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <Button className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-lg shadow-emerald-500/20" asChild>
                    <a href="/" target="_blank">View Live App</a>
                  </Button>
                  <Button variant="outline" className="flex-1 md:flex-none border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {steps.some(s => s.status === 'failed') && !isRunning && (
            <Card className="bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-rose-700 dark:text-rose-400">
                  <div className="bg-rose-500 text-white p-3 rounded-full shadow-lg shadow-rose-500/20">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">فشل في البناء</h3>
                    <p className="text-sm opacity-90">توقفت العملية بسبب خطأ في الموارد. يرجى مراجعة السجلات.</p>
                  </div>
                </div>
                <Button 
                  onClick={startDeployment} 
                  className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white border-0 shadow-lg shadow-rose-500/20"
                >
                  <RotateCcw className="w-4 h-4 ml-2" />
                  Retry Build
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
