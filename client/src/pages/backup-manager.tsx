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
        description: "يتم الآن تجهيز النسخة الاحتياطية...",
      });
    },
    onSuccess: () => {
      setBackupProgress(100);
      queryClient.invalidateQueries({ queryKey: ["/api/backups/logs"] });
      toast({ 
        title: "اكتملت العملية", 
        description: "تم تأمين بياناتك سحابياً بنجاح",
      });
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/backups/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "تم الحذف", description: "تم حذف سجل النسخة الاحتياطية بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/backups/logs"] });
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

  const statsConfig: StatsRowConfig[] = [
    {
      items: [
        {
          key: "status",
          label: "حالة النظام",
          value: "نشط",
          icon: ShieldCheck,
          color: "green",
          subLabel: "النسخ التلقائي مبرمج"
        },
        {
          key: "last_backup",
          label: "آخر نسخة ناجحة",
          value: lastBackup ? formatDate(lastBackup.createdAt) : "لا يوجد",
          icon: Clock,
          color: "blue",
          subLabel: lastBackup ? lastBackup.filename : "في انتظار النسخة الأولى"
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
                className="group relative bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3 hover:shadow-md transition-all duration-300"
              >
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
                      className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        if (window.confirm("حذف هذا السجل؟")) {
                          deleteMutation.mutate(log.id);
                        }
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
