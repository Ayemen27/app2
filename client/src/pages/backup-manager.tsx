import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Database, 
  Download, 
  RotateCcw, 
  ShieldCheck, 
  History,
  Clock,
  HardDrive,
  RefreshCw,
  FileText,
  Loader2,
  Trash2,
  Calendar,
  Globe,
  Monitor,
  Badge,
  CheckCircle2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { Button } from "@/components/ui/button";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BackupLog {
  id: number;
  filename: string;
  size: string;
  status: string;
  destination: string;
  errorMessage?: string;
  triggeredBy?: string;
  createdAt: string;
}

export default function BackupManager() {
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = useState<number | null>(null);
  const [selectedLog, setSelectedLog] = useState<BackupLog | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<'local' | 'cloud' | 'all'>('local');
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [isSuccessfullyRestored, setIsSuccessfullyRestored] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "all",
  });

  const { data: health, isLoading: healthLoading } = useQuery<any>({
    queryKey: ["/api/admin/data-health"],
  });

  const availableDatabases = useMemo(() => {
    if (!health?.data?.databases) return [{ id: 'local', name: 'الجهاز المحلي', description: 'SQLite', type: 'local' }];
    return health.data.databases.map((db: any) => ({
      id: db.name.toLowerCase().includes('central') ? 'cloud' : 'local',
      name: db.name,
      description: db.status || 'Active',
      type: db.name.toLowerCase().includes('central') ? 'cloud' : 'local'
    }));
  }, [health]);

  const { data: logsData, isLoading, refetch } = useQuery<BackupLog[]>({
    queryKey: ["/api/backups/logs"],
    refetchInterval: 5000,
    select: (data: any) => {
      // Log data for debugging
      console.log("Backup logs data received:", data);
      // Handle both direct array and nested logs property
      if (Array.isArray(data)) return data;
      if (data?.logs && Array.isArray(data.logs)) return data.logs;
      if (data?.backups && Array.isArray(data.backups)) return data.backups;
      return [];
    }
  });

  const logs = useMemo(() => Array.isArray(logsData) ? logsData : [], [logsData]);

  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/backups/run", "POST");
      return res;
    },
    onMutate: () => {
      setBackupProgress(5);
      toast({ 
        title: "جاري بدء العملية", 
        description: "يتم الآن تجهيز النسخة الاحتياطية وتوجيهك لتسجيل الدخول إذا لزم الأمر...",
      });
    },
    onSuccess: (data) => {
      setBackupProgress(100);
      queryClient.invalidateQueries({ queryKey: ["/api/backups/logs"] });
      
      if (data.gdriveStatus === 'rejected' && data.gdriveError?.includes('invalid_grant')) {
        toast({
          title: "تنبيه: Google Drive غير متصل",
          description: "تم النسخ إلى Telegram بنجاح، ولكن فشل الرفع إلى Drive. يرجى إعادة تسجيل الدخول.",
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "اكتملت العملية", 
          description: data.gdriveStatus === 'fulfilled' 
            ? "تم تأمين بياناتك في Google Drive و Telegram بنجاح"
            : "تم النسخ إلى Telegram، وفشل Drive مؤقتاً.",
        });
      }
      setTimeout(() => setBackupProgress(0), 3000);
    },
    onError: (error: any) => {
      setBackupProgress(0);
      toast({ 
        title: "فشل إنشاء النسخة", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleGDriveAuth = async () => {
    try {
      toast({
        title: "صلاحيات الوصول",
        description: "جاري توليد رابط المصادقة مع Google Drive...",
      });
      
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();
      
      if (data.success && data.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error(data.error || "فشل في الحصول على رابط المصادقة");
      }
    } catch (error: any) {
      toast({
        title: "خطأ في الربط",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // محاكاة تقدم النسخ الاحتياطي
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (backupMutation.isPending && backupProgress < 95) {
      interval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 95) return prev;
          const increment = Math.floor(Math.random() * 10) + 2;
          return Math.min(prev + increment, 95);
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [backupMutation.isPending, backupProgress]);

  const restoreMutation = useMutation({
    mutationFn: async ({ id, target, fileName }: { id: number; target: string; fileName: string }) => {
      // محاكاة تقدم الاستعادة للتأثيرات الاحترافية
      setRestoreProgress(10);
      const progressInterval = setInterval(() => {
        setRestoreProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 200);

      try {
        const res = await apiRequest("/api/backups/restore", "POST", { fileName, target });
        clearInterval(progressInterval);
        setRestoreProgress(100);
        return res;
      } catch (err) {
        clearInterval(progressInterval);
        setRestoreProgress(0);
        throw err;
      }
    },
    onSuccess: (data: any) => {
      setIsSuccessfullyRestored(true);
      toast({ 
        title: "اكتملت الاستعادة بنجاح", 
        description: data.message || "تمت مزامنة واستعادة جميع الجداول المختارة بنجاح.",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100"
      });
      setTimeout(() => window.location.reload(), 2500);
    },
    onSettled: () => {
      setIsRestoring(null);
      setTimeout(() => {
        if (!isSuccessfullyRestored) {
          setIsRestoreDialogOpen(false);
          setRestoreProgress(0);
        }
      }, 2000);
    }
  });

  const handleRestoreClick = (log: BackupLog) => {
    setSelectedLog(log);
    setIsRestoreDialogOpen(true);
  };

  const [analysisReport, setAnalysisReport] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeMutation = useMutation({
    mutationFn: async (target: string) => {
      setIsAnalyzing(true);
      const res = await apiRequest("/api/backups/analyze", "POST", { target });
      return res;
    },
    onSuccess: (data) => {
      setAnalysisReport(data.report || []);
      toast({ title: "اكتمل التحليل", description: "تم فحص جميع الجداول بنجاح" });
    },
    onSettled: () => setIsAnalyzing(false)
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await apiRequest("/api/backups/test-connection", "POST", { target });
      return res;
    },
    onSuccess: (data) => {
      toast({ 
        title: data.success ? "اتصال ناجح" : "فشل الاتصال", 
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    }
  });

  const createTablesMutation = useMutation({
    mutationFn: async ({ target, tables }: { target: string; tables: string[] }) => {
      const res = await apiRequest("/api/backups/create-tables", "POST", { target, tables });
      return res;
    },
    onSuccess: (data) => {
      toast({ title: "تم إنشاء الجداول", description: data.message });
      analyzeMutation.mutate(restoreTarget);
    }
  });

  const missingTables = useMemo(() => analysisReport.filter(t => t.status === 'missing').map(t => t.table), [analysisReport]);

  const confirmRestore = () => {
    if (!selectedLog) return;
    setIsRestoring(selectedLog.id);
    restoreMutation.mutate({ 
      id: selectedLog.id, 
      target: restoreTarget, 
      fileName: selectedLog.filename 
    });
  };

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteProgress, setDeleteProgress] = useState(0);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingId(id);
      setDeleteProgress(10);
      
      const interval = setInterval(() => {
        setDeleteProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 150);

      try {
        await apiRequest(`/api/backups/${id}`, "DELETE");
        clearInterval(interval);
        setDeleteProgress(100);
      } catch (error) {
        clearInterval(interval);
        throw error;
      }
    },
    onSuccess: () => {
      setTimeout(() => {
        toast({ 
          title: "تم الحذف بنجاح", 
          description: "تم إزالة سجل النسخة الاحتياطية وتطهير البيانات المرتبطة.",
          className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100"
        });
        queryClient.invalidateQueries({ queryKey: ["/api/backups/logs"] });
        setDeletingId(null);
        setDeleteProgress(0);
      }, 600);
    },
    onError: (error: any) => {
      setDeletingId(null);
      setDeleteProgress(0);
      toast({ 
        title: "فشل الحذف", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const filteredLogs = useMemo(() => {
    return logs.map((log: any) => ({
      ...log,
      filename: log.filename || log.path || `backup-${log.id}`,
      status: log.status || 'success',
      createdAt: log.createdAt || log.timestamp
    })).filter((log: any) => {
      const matchesSearch = !searchValue || 
        log.filename.toLowerCase().includes(searchValue.toLowerCase());
      const matchesStatus = filterValues.status === "all" || log.status === filterValues.status;
      return matchesSearch && matchesStatus;
    });
  }, [logs, searchValue, filterValues.status]);

  const lastBackup = logs.find((l: any) => l.status === 'success');

  const { data: emergencyStatus } = useQuery<any>({
    queryKey: ["/api/system/emergency-status"],
    refetchInterval: 10000,
  });

  const statsConfig: StatsRowConfig[] = [
    {
      items: [
        {
          key: "status",
          label: "حالة النظام",
          value: emergencyStatus?.data?.isEmergencyMode ? "وضع الطوارئ" : "نشط (سحابي)",
          icon: ShieldCheck,
          color: emergencyStatus?.data?.isEmergencyMode ? "orange" : "green",
          subLabel: emergencyStatus?.data?.dbType || "النسخ التلقائي مبرمج"
        },
        {
          key: "integrity",
          label: "سلامة البيانات",
          value: emergencyStatus?.data?.integrity?.status === "success" ? "سليمة" : "تحتاج فحص",
          icon: Database,
          color: emergencyStatus?.data?.integrity?.status === "success" ? "green" : "rose",
          subLabel: `آخر فحص: ${emergencyStatus?.data?.integrity?.lastChecked ? formatDate(emergencyStatus.data.integrity.lastChecked) : 'غير متوفر'}`
        },
        {
          key: "total_logs",
          label: "إجمالي السجلات",
          value: String(logs.length),
          icon: History,
          color: "purple",
          subLabel: "محفوظات النظام"
        }
      ]
    }
  ];

  const filterConfig: FilterConfig[] = [
    {
      key: "status",
      label: "الحالة",
      type: "select",
      options: [
        { label: "الكل", value: "all" },
        { label: "ناجحة", value: "success" },
        { label: "فاشلة", value: "error" },
      ]
    }
  ];

  return (
    <div className="fade-in pb-32" dir="rtl">
      <UnifiedFilterDashboard
        statsRows={statsConfig}
        filters={filterConfig}
        searchValue={searchValue}
        filterValues={filterValues}
        onSearchChange={setSearchValue}
        onFilterChange={(key, val) => setFilterValues(prev => ({ ...prev, [key]: val }))}
        onReset={() => {
          setSearchValue("");
          setFilterValues({ status: "all" });
        }}
        onRefresh={refetch}
        isRefreshing={isLoading || backupMutation.isPending}
        searchPlaceholder="البحث في أسماء الملفات..."
        actions={[
          {
            key: "auth-gdrive",
            label: "ربط Google Drive",
            icon: HardDrive,
            onClick: handleGDriveAuth,
            variant: "outline"
          },
          {
            key: "run-backup",
            label: backupMutation.isPending ? "جاري النسخ..." : "نسخة فورية",
            icon: backupMutation.isPending ? Loader2 : ShieldCheck,
            onClick: () => backupMutation.mutate(),
            disabled: backupMutation.isPending,
            variant: "default"
          }
        ]}
      />
      
      {backupMutation.isPending && (
        <div className="px-4 mt-4">
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">جاري معالجة النسخة الاحتياطية...</span>
              </div>
              <span className="text-sm font-bold text-primary">{backupProgress}%</span>
            </div>
            <Progress value={backupProgress} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-2">
              يتم الآن ضغط قاعدة البيانات، رفع الملف إلى Google Drive، وإرسال إشعار Telegram.
            </p>
          </div>
        </div>
      )}
      
      <div className="mt-6 px-4">
        {isLoading && logs.length === 0 ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-40 rounded-xl border bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/10">
            <HardDrive className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">لا توجد سجلات</h3>
            <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto mt-2">
              لم يتم العثور على أي سجلات. اضغط على "نسخة فورية" للبدء.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className={`group relative bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3 hover:shadow-md transition-all duration-500 overflow-hidden ${deletingId === log.id ? 'ring-2 ring-rose-500/50 scale-[0.98]' : ''}`}
              >
                {/* Delete Progress Overlay */}
                {deletingId === log.id && (
                  <div className="absolute inset-0 z-50 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-[200px] space-y-3">
                      <div className="relative h-12 w-12 mx-auto">
                        <div className="absolute inset-0 rounded-full border-2 border-rose-500/20"></div>
                        <div 
                          className="absolute inset-0 rounded-full border-2 border-rose-600 border-t-transparent animate-spin"
                          style={{ animationDuration: '0.6s' }}
                        ></div>
                        <Trash2 className="absolute inset-0 m-auto h-5 w-5 text-rose-600 animate-pulse" />
                      </div>
                      <div className="space-y-1.5 text-center">
                        <p className="text-[11px] font-bold text-rose-600 animate-pulse">جاري الحذف الآمن...</p>
                        <div className="h-1.5 w-full bg-rose-100 dark:bg-rose-900/30 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(225,29,72,0.4)]"
                            style={{ width: `${deleteProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-mono text-rose-500/70">
                          <span>DELETING_BLOCKS</span>
                          <span>{deleteProgress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${log.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={log.filename}>
                        {log.filename}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(log.createdAt)}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>{log.size ? `${log.size} MB` : '...'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                      asChild
                    >
                      <a href={`/api/backups/download/${log.id}`} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-orange-600 hover:bg-orange-50"
                      disabled={isRestoring !== null}
                      onClick={() => handleRestoreClick(log)}
                    >
                      {isRestoring === log.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-rose-600 hover:bg-rose-50 active-elevate-2 transition-transform active:scale-90"
                      disabled={deletingId !== null || isRestoring !== null}
                      onClick={() => {
                        const { dismiss } = toast({
                          title: "تأكيد الحذف",
                          description: "هل أنت متأكد من حذف هذه النسخة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
                          action: (
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => {
                                dismiss();
                                deleteMutation.mutate(log.id);
                              }}
                            >
                              تأكيد الحذف
                            </Button>
                          ),
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {log.status !== 'success' && log.errorMessage && (
                  <p className="mt-2 text-[10px] text-rose-500 bg-rose-50 p-1.5 rounded-md border border-rose-100 truncate">
                    {log.errorMessage}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-600" />
              تأكيد استعادة البيانات
            </DialogTitle>
            <DialogDescription className="text-right">
              أنت على وشك استعادة البيانات من النسخة: <br/>
              <span className="font-mono text-xs text-blue-600 font-bold">{selectedLog?.filename}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <label className="text-sm font-bold block text-right flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                اختر قاعدة البيانات المستهدفة (اكتشاف تلقائي):
              </label>
              <div className="flex gap-2">
                <Select 
                  value={restoreTarget} 
                  onValueChange={(val: any) => setRestoreTarget(val)}
                >
                  <SelectTrigger className="w-full rounded-2xl border-2 h-14 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white transition-all">
                    <SelectValue placeholder="اختر القاعدة المكتشفة" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2 shadow-2xl">
                    {availableDatabases.map((db: any) => (
                      <SelectItem key={db.id} value={db.type} className="flex items-center gap-2 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <div className="flex items-center gap-3 w-full">
                          <div className={`p-2 rounded-xl ${db.type === 'cloud' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            {db.type === 'cloud' ? <Globe className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                          </div>
                          <div className="text-right flex-1">
                            <p className="font-black text-sm">{db.name}</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{db.description}</p>
                          </div>
                          {db.type === 'cloud' && <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-bold">ONLINE</Badge>}
                          {db.type === 'local' && <Badge className="bg-blue-500/10 text-blue-600 border-none text-[9px] font-bold">OFFLINE</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="all" className="flex items-center gap-2 py-4 cursor-pointer border-t mt-2">
                      <div className="flex items-center gap-3 w-full">
                        <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                          <RefreshCw className="h-5 w-5" />
                        </div>
                        <div className="text-right flex-1">
                          <p className="font-black text-sm text-purple-700">جميع القواعد المكتشفة</p>
                          <p className="text-[10px] text-purple-500/70 font-medium">استعادة متزامنة (Full Sync Restore)</p>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  className="h-14 px-4 rounded-2xl"
                  onClick={() => testConnectionMutation.mutate(restoreTarget)}
                >
                  <RefreshCw className={`h-5 w-5 ${testConnectionMutation.isPending ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <Button 
                variant="secondary" 
                className="w-full h-12 rounded-xl text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 shadow-sm"
                onClick={() => analyzeMutation.mutate(restoreTarget)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <ShieldCheck className="h-4 w-4 ml-2" />}
                فحص هيكل الجداول قبل الاستعادة (تأكيد التطابق)
              </Button>

              {analysisReport.length > 0 && (
                <div className="space-y-3 animate-in fade-in duration-500">
                  <div className="max-h-48 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-[11px] space-y-2 shadow-inner">
                    <p className="font-black text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      تقرير تحليل الهيكل (طبق الأصل):
                    </p>
                    {analysisReport.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 pb-2 last:border-0">
                        <span className="font-mono font-medium">{item.table}</span>
                        <div className="flex items-center gap-2">
                          {item.status === 'exists' ? (
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm">موجود ✓</span>
                          ) : (
                            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm animate-pulse">مفقود ✗</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {missingTables.length > 0 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border-2 border-amber-200 dark:border-amber-900/40 space-y-3">
                      <div className="flex items-start gap-3 text-amber-800 dark:text-amber-200">
                        <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-black">تم اكتشاف جداول مفقودة</p>
                          <p className="text-[10px] opacity-80">يجب بناء الهيكل المطابق (Exact Replica) قبل الاستعادة لضمان سلامة العلاقات.</p>
                        </div>
                      </div>
                      <Button 
                        variant="default" 
                        className="w-full h-11 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 active-elevate-2 transition-all"
                        onClick={() => createTablesMutation.mutate({ target: restoreTarget, tables: missingTables })}
                        disabled={createTablesMutation.isPending}
                      >
                        {createTablesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Database className="h-4 w-4 ml-2" />}
                        إنشاء جميع الجداول المفقودة الآن
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {isRestoring !== null && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex justify-between items-center text-[11px] font-black text-primary uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    جاري حقن البيانات...
                  </span>
                  <span>{restoreProgress}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                    style={{ width: `${restoreProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-center text-muted-foreground font-medium animate-pulse">
                  يتم الآن التحقق من صحة الجداول، إيقاف المفاتيح الخارجية، واستبدال السجلات...
                </p>
              </div>
            )}

            {isSuccessfullyRestored && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-[1.5rem] border-2 border-emerald-200 dark:border-emerald-800 animate-in zoom-in-95 duration-500 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-emerald-800 dark:text-emerald-200 leading-tight">
                    تمت الاستعادة بنجاح!
                  </p>
                  <p className="text-[11px] text-emerald-600/80 font-medium mt-1">
                    سيتم إعادة تحميل النظام لتطبيق التغييرات فوراً.
                  </p>
                </div>
              </div>
            )}
            
            {!isRestoring && !isSuccessfullyRestored && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border-2 border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
                  ⚠️ تنبيه: سيتم استبدال جميع البيانات الحالية في القاعدة المختارة. تأكد من أنك تملك صلاحيات كافية لهذا الإجراء.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 sm:justify-start">
            <Button 
              variant="outline" 
              onClick={() => setIsRestoreDialogOpen(false)}
              className="rounded-2xl px-6 h-12 border-2 font-bold hover:bg-slate-50 transition-all"
              disabled={isRestoring !== null || isSuccessfullyRestored}
            >
              إلغاء
            </Button>
            <Button 
              variant="default" 
              className="bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-2xl px-10 h-12 font-black text-base shadow-xl hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
              onClick={confirmRestore}
              disabled={isRestoring !== null || isSuccessfullyRestored}
            >
              {isRestoring !== null ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <RotateCcw className="ml-2 h-5 w-5" />
                  بدء الاستعادة الآمنة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
