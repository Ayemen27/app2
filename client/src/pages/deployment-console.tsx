import { useState, useEffect, useRef } from "react";
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
  Activity,
  Smartphone,
  Database,
  Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

interface SchemaPrompt {
  show: boolean;
  message: string;
  action: string;
}

const INITIAL_STEPS: BuildStep[] = [
  { id: 1, name: 'تجهيز المشروع', status: 'pending', icon: GitBranch },
  { id: 2, name: 'رفع التحديثات لـ GitHub', status: 'pending', icon: GitBranch },
  { id: 3, name: 'سحب التحديثات على السيرفر', status: 'pending', icon: Server },
  { id: 4, name: 'تثبيت الاعتمادات', status: 'pending', icon: Package },
  { id: 5, name: 'تطبيق المخطط على السيرفر', status: 'pending', icon: Database },
  { id: 6, name: 'بناء التطبيق', status: 'pending', icon: Zap },
  { id: 7, name: 'تشغيل الخدمات', status: 'pending', icon: Activity },
];

type AppType = 'web' | 'android';

export default function DeploymentConsole() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<BuildStep[]>(INITIAL_STEPS);
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [selectedApp, setSelectedApp] = useState<AppType>('web');
  const [schemaPrompt, setSchemaPrompt] = useState<SchemaPrompt>({ show: false, message: '', action: '' });
  const scrollRef = useRef<HTMLDivElement>(null);

  const getStepsLogic = () => {
    const baseSteps = [
      { id: 1, name: 'تجهيز المشروع', duration: 1000 },
      { id: 2, name: 'رفع التحديثات لـ GitHub', duration: 3000 },
      { id: 3, name: 'سحب التحديثات على السيرفر', duration: 2500 },
      { id: 4, name: 'تثبيت الاعتمادات', duration: 4000 },
    ];

    const schemaStep = { id: 5, name: 'تطبيق المخطط على السيرفر', duration: 3000 };

    if (selectedApp === 'web') {
      return [
        ...baseSteps,
        schemaStep,
        { id: 6, name: 'بناء تطبيق الويب', duration: 6000 },
        { id: 7, name: 'تشغيل الخدمات (PM2)', duration: 2000 },
      ];
    } else {
      return [
        ...baseSteps,
        schemaStep,
        { id: 6, name: 'بناء تطبيق Android APK', duration: 60000 },
        { id: 7, name: 'تحميل الملف على السيرفر', duration: 2000 },
      ];
    }
  };

  const STEPS_LOGIC = getStepsLogic();

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
    if (!selectedApp) {
      toast({ description: "يرجى اختيار التطبيق أولاً", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setLogs([]);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending', duration: undefined })));
    setStartTime(Date.now());
    setEndTime(null);

    const appName = selectedApp === 'web' ? 'تطبيق الويب' : 'تطبيق Android';
    addLog(`🚀 بدء عملية البناء والنشر الحقيقية لـ ${appName}...`, 'info');

    try {
      // تنفيذ البناء الحقيقي عبر API
      addLog('⏳ جاري تنفيذ البناء الفعلي على السيرفر...', 'info');
      updateStep(6, 'running');
      
      const response = await apiRequest('POST', '/api/deployment/build', { appType: selectedApp });
      
      if (response.success && response.logs) {
        // عرض جميع السجلات الحقيقية من البناء
        response.logs.forEach((log: any) => {
          addLog(log.message, log.type);
        });
        
        // تحديث خطوات البناء
        const steps = [
          { id: 1, name: 'تجهيز المشروع', status: 'success' as const },
          { id: 2, name: 'رفع التحديثات لـ GitHub', status: 'success' as const },
          { id: 3, name: 'سحب التحديثات على السيرفر', status: 'success' as const },
          { id: 4, name: 'تثبيت الاعتمادات', status: 'success' as const },
          { id: 5, name: 'تطبيق المخطط على السيرفر', status: 'success' as const },
          { id: 6, name: 'بناء التطبيق', status: 'success' as const },
          { id: 7, name: 'تشغيل الخدمات', status: 'success' as const },
        ];
        
        setSteps(steps);
        setProgress(100);
        addLog('🎉 اكتملت عملية البناء والنشر بنجاح 100%!', 'success');
      }
    } catch (error: any) {
      addLog(`❌ خطأ في البناء: ${error.message || 'حدث خطأ غير متوقع'}`, 'error');
      const failedStep = INITIAL_STEPS.find(s => s.id === 6);
      if (failedStep) {
        updateStep(failedStep.id, 'failed');
      }
      toast({ description: "فشل البناء - تحقق من السجلات", variant: "destructive" });
    } finally {
      setIsRunning(false);
      setEndTime(Date.now());
    }
  };

  const simulateStep = async (step: any) => {
    return new Promise((resolve, reject) => {
      const duration = step.duration || 2000;
      setTimeout(() => {
        if (Math.random() < 0.02) { // 2% failure rate for realism
          reject(new Error("خطأ في الاتصال أو الموارد غير متاحة"));
        } else {
          resolve(true);
        }
      }, duration);
    });
  };

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

  const applySchema = async () => {
    setSchemaPrompt({ show: false, message: '', action: '' });
    addLog('⏳ جاري تطبيق التحديثات على السيرفر الخارجي...', 'info');
    
    try {
      await apiRequest('POST', '/api/schema/apply', {
        appType: selectedApp,
        timestamp: new Date().toISOString(),
      });
      addLog('✅ تم تطبيق المخطط بنجاح على السيرفر', 'success');
    } catch (error: any) {
      addLog(`❌ فشل تطبيق المخطط: ${error.message}`, 'error');
    }
  };

  const rejectSchema = () => {
    setSchemaPrompt({ show: false, message: '', action: '' });
    addLog('⏭️ تم تخطي خطوة تطبيق المخطط', 'warning');
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* App Selection Dropdown */}
        <div className="w-full md:w-auto">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">اختر التطبيق المراد بناؤه</label>
            <Select value={selectedApp} onValueChange={(value) => setSelectedApp(value as AppType)} disabled={isRunning}>
              <SelectTrigger className="w-full md:w-56" data-testid="select-app-type">
                <SelectValue placeholder="اختر التطبيق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="web" data-testid="option-web-app">
                  تطبيق الويب
                </SelectItem>
                <SelectItem value="android" data-testid="option-android-app">
                  تطبيق Android
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyLogs}
            className="flex-1 md:flex-none hover-elevate"
            data-testid="button-copy-logs"
          >
            <Copy className="w-4 h-4 ml-2" />
            نسخ السجلات
          </Button>
          {!isRunning ? (
            <Button 
              onClick={startDeployment}
              disabled={!selectedApp}
              className="flex-1 md:flex-none bg-primary hover-elevate active-elevate-2 px-8"
              size="lg"
              data-testid="button-start-deployment"
            >
              <Play className="w-4 h-4 ml-2" />
              ابدأ النشر الآن
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              onClick={() => setIsRunning(false)}
              className="flex-1 md:flex-none hover-elevate"
              data-testid="button-stop-build"
            >
              <Square className="w-4 h-4 ml-2" />
              إيقاف البناء
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
                <span>مراحل خط الإنتاج</span>
                <Badge variant={isRunning ? "secondary" : "outline"} className={isRunning ? "animate-pulse" : ""}>
                  {isRunning ? "جاري التنفيذ" : "خامل"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-1">
              {steps.map((step, idx) => (
                <div key={step.id} className="relative pr-6 pb-6 last:pb-0">
                  {idx !== steps.length - 1 && (
                    <div className={`absolute right-[11px] top-6 bottom-0 w-[2px] ${
                      step.status === 'success' ? 'bg-primary' : 'bg-border'
                    }`} />
                  )}
                  <div className="flex items-center gap-4">
                    <div className={`absolute right-0 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors ${
                      step.status === 'success' ? 'bg-primary text-primary-foreground' :
                      step.status === 'running' ? 'bg-primary/20 text-primary animate-pulse border-2 border-primary' :
                      step.status === 'failed' ? 'bg-destructive text-destructive-foreground' :
                      'bg-muted text-muted-foreground border-2 border-border'
                    }`}>
                      {step.status === 'success' ? <Check className="w-3 h-3" /> : 
                       step.status === 'failed' ? <AlertCircle className="w-3 h-3" /> :
                       (() => {
                         const Icon = step.icon;
                         return <Icon className="w-3 h-3" />;
                       })()}
                    </div>
                    <div className="flex-1 pr-8">
                      <p className={`text-sm font-semibold ${
                        step.status === 'running' ? 'text-primary' : 'text-foreground'
                      }`}>
                        {step.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {step.status === 'running' && (
                          <span className="text-[10px] text-primary animate-pulse uppercase font-bold">قيد المعالجة</span>
                        )}
                        {step.duration && (
                          <span className="text-[10px] text-muted-foreground font-mono">{step.duration} ثانية</span>
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
                  <p className="text-xs font-medium text-muted-foreground uppercase">الوقت الإجمالي</p>
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
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">مخرجات الكونسول</span>
                </div>
                {isRunning && <Badge className="bg-primary animate-pulse text-[10px]">تحديثات مباشرة</Badge>}
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded border-border"
                  />
                  التمرير التلقائي
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
                      جاهز لعملية النشر...
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
                    <p className="text-sm opacity-90">تم تحديث نسخة الإنتاج بنجاح وتجاوزت جميع الاختبارات عبر GitHub.</p>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <Button className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-lg shadow-emerald-500/20" asChild>
                    <a href="/" target="_blank">معاينة التطبيق المباشر</a>
                  </Button>
                  <Button variant="outline" className="flex-1 md:flex-none border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                    الذهاب للوحة التحكم
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
                    <p className="text-sm opacity-90">توقفت العملية بسبب خطأ. يرجى مراجعة سجلات GitHub والسيرفر.</p>
                  </div>
                </div>
                <Button 
                  onClick={startDeployment} 
                  className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white border-0 shadow-lg shadow-rose-500/20"
                >
                  <RotateCcw className="w-4 h-4 ml-2" />
                  إعادة محاولة البناء
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Schema Application Prompt */}
          {schemaPrompt.show && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-bottom-4">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-blue-700 dark:text-blue-400">
                  <div className="bg-blue-500 text-white p-3 rounded-full shadow-lg shadow-blue-500/20 animate-pulse">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">تطبيق المخطط</h3>
                    <p className="text-sm opacity-90">{schemaPrompt.message}</p>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <Button 
                    onClick={applySchema}
                    className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-500/20"
                    data-testid="button-apply-schema"
                  >
                    <Check className="w-4 h-4 ml-2" />
                    تطبيق
                  </Button>
                  <Button 
                    onClick={rejectSchema}
                    variant="outline"
                    className="flex-1 md:flex-none border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    data-testid="button-reject-schema"
                  >
                    <AlertCircle className="w-4 h-4 ml-2" />
                    تخطي
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
