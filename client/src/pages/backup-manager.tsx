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
  Calendar
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { Button } from "@/components/ui/button";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { Progress } from "@/components/ui/progress";

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
  const [searchValue, setSearchValue] = useState("");
  const [backupProgress, setBackupProgress] = useState(0);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "all",
  });

  const { data: logsData, isLoading, refetch } = useQuery<BackupLog[]>({
    queryKey: ["/api/backups/logs"],
    refetchInterval: 5000,
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
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/backups/restore/${id}`, "POST");
      return res;
    },
    onSuccess: () => {
      toast({ 
        title: "اكتملت الاستعادة", 
        description: "تمت استعادة البيانات بنجاح",
      });
      setTimeout(() => window.location.reload(), 2000);
    },
    onSettled: () => setIsRestoring(null)
  });

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
    return logs.filter(log => {
      const matchesSearch = !searchValue || 
        log.filename.toLowerCase().includes(searchValue.toLowerCase());
      const matchesStatus = filterValues.status === "all" || log.status === filterValues.status;
      return matchesSearch && matchesStatus;
    });
  }, [logs, searchValue, filterValues.status]);

  const lastBackup = logs.find(l => l.status === 'success');

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
            variant: "outline",
            className: "border-primary text-primary"
          },
          {
            key: "run-backup",
            label: backupMutation.isPending ? "جاري النسخ..." : "نسخة فورية",
            icon: backupMutation.isPending ? Loader2 : ShieldCheck,
            onClick: () => backupMutation.mutate(),
            disabled: backupMutation.isPending,
            variant: "default",
            className: backupMutation.isPending ? "animate-pulse" : ""
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
                      onClick={() => {
                        if (window.confirm("استبدال البيانات الحالية بهذه النسخة؟")) {
                          setIsRestoring(log.id);
                          restoreMutation.mutate(log.id);
                        }
                      }}
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
    </div>
  );
}
