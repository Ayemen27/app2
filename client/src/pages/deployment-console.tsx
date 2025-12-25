import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Terminal
} from "lucide-react";

interface BuildLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface BuildStatus {
  isRunning: boolean;
  progress: number;
  currentStep: string;
  version: string;
  logs: BuildLog[];
  startTime?: number;
  endTime?: number;
  success?: boolean;
}

const STEPS = [
  { id: 1, label: 'تحديث الإصدار', icon: GitBranch },
  { id: 2, label: 'إنشاء الأرشيف', icon: Package },
  { id: 3, label: 'نقل الملفات', icon: Server },
  { id: 4, label: 'بناء APK', icon: Zap },
  { id: 5, label: 'اكتمال البناء', icon: Check },
];

export default function DeploymentConsole() {
  const [status, setStatus] = useState<BuildStatus>({
    isRunning: false,
    progress: 0,
    currentStep: 'جاهز للبناء',
    version: '1.0.8',
    logs: [],
  });
  const [autoScroll, setAutoScroll] = useState(true);

  // Simulate build process
  const startBuild = async () => {
    setStatus(prev => ({
      ...prev,
      isRunning: true,
      progress: 0,
      logs: [],
      startTime: Date.now(),
      success: undefined,
    }));

    // Step 1: Version Update
    addLog('جاري تحديث رقم الإصدار...', 'info');
    await sleep(2000);
    updateProgress(1, 20, 'تحديث الإصدار');
    addLog('✅ تم تحديث الإصدار إلى 1.0.9', 'success');

    // Step 2: Archive Creation
    await sleep(500);
    addLog('📦 إنشاء أرشيف الملفات...', 'info');
    await sleep(3000);
    updateProgress(2, 40, 'إنشاء الأرشيف');
    addLog('✅ تم إنشاء أرشيف بحجم 137MB', 'success');

    // Step 3: Transfer
    await sleep(500);
    addLog('📥 بدء نقل الملفات للسيرفر...', 'info');
    await sleep(4000);
    updateProgress(3, 60, 'نقل الملفات');
    addLog('✅ تم نقل الملفات بنجاح', 'success');

    // Step 4: Build
    await sleep(500);
    addLog('🔨 جاري بناء APK على السيرفر...', 'info');
    addLog('  └─ إعداد Gradle...', 'info');
    await sleep(2000);
    addLog('  └─ تنزيل الاعتماديات...', 'info');
    await sleep(3000);
    addLog('  └─ ترجمة الكود...', 'info');
    await sleep(3000);
    addLog('  └─ إنشاء APK...', 'info');
    await sleep(2000);
    updateProgress(4, 85, 'بناء APK');
    addLog('✅ BUILD SUCCESSFUL in 56s', 'success');

    // Step 5: Complete
    await sleep(500);
    updateProgress(5, 100, 'اكتمل البناء');
    addLog('📱 APK جاهز: app/build/outputs/apk/debug/app-debug.apk', 'success');

    setStatus(prev => ({
      ...prev,
      isRunning: false,
      progress: 100,
      currentStep: 'اكتمل البناء بنجاح ✅',
      endTime: Date.now(),
      success: true,
    }));
  };

  const stopBuild = () => {
    addLog('❌ تم إيقاف البناء من قبل المستخدم', 'error');
    setStatus(prev => ({
      ...prev,
      isRunning: false,
      success: false,
      endTime: Date.now(),
    }));
  };

  const addLog = (message: string, type: BuildLog['type'] = 'info') => {
    setStatus(prev => ({
      ...prev,
      logs: [
        ...prev.logs,
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString('ar-SA'),
          message,
          type,
        },
      ],
    }));
  };

  const updateProgress = (step: number, progress: number, stepLabel: string) => {
    setStatus(prev => ({
      ...prev,
      progress,
      currentStep: stepLabel,
    }));
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const currentStepIndex = Math.ceil((status.progress / 100) * STEPS.length) - 1;

  const getDuration = () => {
    if (!status.startTime) return '00:00';
    const end = status.endTime || Date.now();
    const duration = Math.floor((end - status.startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Terminal className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">لوحة التحكم</h1>
          </div>
          <p className="text-slate-400">نظام البناء والنشر الآلي - BinarJoin</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Console */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card className="bg-slate-800 border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${status.isRunning ? 'bg-yellow-400 animate-pulse' : status.success ? 'bg-green-400' : 'bg-slate-500'}`} />
                  <div>
                    <p className="text-sm text-slate-400">الحالة الحالية</p>
                    <p className="text-xl font-semibold text-white">{status.currentStep}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">النسخة</p>
                  <p className="text-2xl font-bold text-blue-400">{status.version}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-300">التقدم</span>
                  <span className="text-sm font-bold text-blue-400">{status.progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
              </div>

              {/* Timeline */}
              <div className="mt-6 space-y-3">
                {STEPS.map((step, idx) => {
                  const isCompleted = idx < currentStepIndex || (idx === currentStepIndex && status.progress > idx * 20);
                  const isActive = idx === currentStepIndex;
                  const Icon = step.icon;

                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isCompleted ? 'bg-green-500/20 text-green-400' :
                        isActive ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={`text-sm font-medium ${
                        isCompleted ? 'text-green-400' :
                        isActive ? 'text-blue-400' :
                        'text-slate-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Control Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={startBuild}
                disabled={status.isRunning}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-2"
                data-testid="button-start-build"
              >
                <Play className="w-4 h-4 ml-2" />
                {status.isRunning ? 'جاري البناء...' : 'ابدأ البناء'}
              </Button>
              <Button
                onClick={stopBuild}
                disabled={!status.isRunning}
                variant="destructive"
                className="flex-1 py-2"
                data-testid="button-stop-build"
              >
                <Square className="w-4 h-4 ml-2" />
                إيقاف
              </Button>
            </div>

            {/* Logs Console */}
            <Card className="bg-slate-900 border-slate-700 overflow-hidden">
              <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-white">السجلات</h3>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="w-3 h-3"
                  />
                  تمرير تلقائي
                </label>
              </div>
              <ScrollArea className="h-[400px] bg-slate-900 font-mono text-sm">
                <div className="p-4 space-y-1">
                  {status.logs.length === 0 ? (
                    <div className="text-slate-500 italic">السجلات ستظهر هنا عند بدء البناء...</div>
                  ) : (
                    status.logs.map(log => (
                      <div key={log.id} className="flex gap-2">
                        <span className="text-slate-500 flex-shrink-0 w-20">{log.timestamp}</span>
                        <span className={`flex-1 ${
                          log.type === 'success' ? 'text-green-400' :
                          log.type === 'error' ? 'text-red-400' :
                          log.type === 'warning' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-4">
            {/* Time */}
            <Card className="bg-slate-800 border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-xs text-slate-400">المدة</p>
                  <p className="text-2xl font-bold text-white">{getDuration()}</p>
                </div>
              </div>
            </Card>

            {/* Server Status */}
            <Card className="bg-slate-800 border-slate-700 p-4">
              <div className="flex items-center gap-3 mb-3">
                <Server className="w-5 h-5 text-green-400" />
                <p className="text-sm font-semibold text-white">حالة السيرفر</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">الحالة</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">متصل</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الإصدار</span>
                  <span className="text-white font-mono">1.0.8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">آخر بناء</span>
                  <span className="text-white text-xs">قبل دقائق</span>
                </div>
              </div>
            </Card>

            {/* Last Build Result */}
            {status.success !== undefined && (
              <Card className={`p-4 border ${status.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-start gap-3">
                  {status.success ? (
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-semibold ${status.success ? 'text-green-400' : 'text-red-400'}`}>
                      {status.success ? 'نجح البناء' : 'فشل البناء'}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {status.success 
                        ? '✅ APK جاهز للاختبار والنشر'
                        : '❌ حدث خطأ أثناء البناء'
                      }
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
