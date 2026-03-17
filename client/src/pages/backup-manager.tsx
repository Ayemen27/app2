import { useState, useMemo, useEffect } from "react";
import { getAccessToken, getFetchCredentials, getClientPlatformHeader, getAuthHeaders } from '@/lib/auth-token-store';
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Database, 
  Download, 
  RotateCcw, 
  ShieldCheck, 
  History,
  HardDrive,
  RefreshCw,
  FileText,
  Loader2,
  Trash2,
  Calendar,
  Globe,
  Monitor,
  CheckCircle2,
  Clock,
  Archive,
  Activity,
  Server,
  FileArchive,
  User,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import { UnifiedCard, UnifiedCardGrid, UnifiedCardSkeleton } from "@/components/ui/unified-card";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BackupLog {
  filename: string;
  size: string;
  sizeBytes: number;
  compressed: boolean;
  format: string;
  status: string;
  created_at: string;
  tablesCount: number | null;
  totalRows: number | null;
  durationMs: number | null;
  triggeredBy: string | null;
}

interface BackupStatus {
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  totalSuccess: number;
  totalFailure: number;
  isRunning: boolean;
  schedulerEnabled: boolean;
  cronSchedule: string;
}

export default function BackupManager() {
  const { toast } = useToast();
  const [selectedLog, setSelectedLog] = useState<BackupLog | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<string>('local');
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isSuccessfullyRestored, setIsSuccessfullyRestored] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "all",
  });

  const { data: statusData } = useQuery<BackupStatus & { storage?: any }>({
    queryKey: QUERY_KEYS.backupsStatus,
    refetchInterval: 5000,
  });

  const backupStatus = statusData ? {
    lastRunAt: statusData.lastRunAt,
    lastSuccessAt: statusData.lastSuccessAt,
    lastFailureAt: statusData.lastFailureAt,
    lastError: statusData.lastError,
    totalSuccess: statusData.totalSuccess,
    totalFailure: statusData.totalFailure,
    isRunning: statusData.isRunning,
    schedulerEnabled: statusData.schedulerEnabled,
    cronSchedule: statusData.cronSchedule,
  } as BackupStatus : undefined;
  const storageInfo = statusData?.storage;

  const { data: dbList } = useQuery<any[]>({
    queryKey: QUERY_KEYS.backupsDatabases,
  });

  const availableDatabases = useMemo(() => {
    if (Array.isArray(dbList) && dbList.length > 0) return dbList;
    return [{ id: 'local', name: 'LOCAL' }];
  }, [dbList]);

  const { data: logsData, isLoading, refetch } = useQuery<BackupLog[]>({
    queryKey: QUERY_KEYS.backupsLogs,
    refetchInterval: 10000,
  });

  const logs = useMemo(() => Array.isArray(logsData) ? logsData : [], [logsData]);

  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/backups/run", "POST");
      return res;
    },
    onMutate: () => {
      toast({ 
        title: "جاري إنشاء النسخة الاحتياطية", 
        description: "يتم الآن نسخ جميع الجداول وضغط البيانات...",
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.backupsLogs });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.backupsStatus });
      
      if (data.success) {
        toast({ 
          title: "تم النسخ الاحتياطي بنجاح", 
          description: `${data.tablesCount} جدول | ${data.totalRows} صف | ${data.sizeMB} MB | ضغط ${data.compressionRatio}`,
        });
      } else {
        toast({ 
          title: "فشل النسخ الاحتياطي", 
          description: data.message,
          variant: "destructive" 
        });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "فشل إنشاء النسخة", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ target, fileName }: { target: string; fileName: string }) => {
      const res = await apiRequest("/api/backups/restore", "POST", { fileName, target });
      return res;
    },
    onMutate: () => {
      toast({ 
        title: "جاري الاستعادة", 
        description: "يتم الآن تحضير البيانات واستعادة الجداول...",
      });
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setIsSuccessfullyRestored(true);
        toast({ 
          title: "تمت الاستعادة بنجاح", 
          description: data.message,
        });
        setTimeout(() => window.location.reload(), 3000);
      } else {
        toast({ 
          title: "فشل الاستعادة", 
          description: data.message,
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "فشل الاستعادة", 
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      if (!isSuccessfullyRestored) {
        setIsRestoreDialogOpen(false);
      }
    }
  });

  const handleRestoreClick = (log: BackupLog) => {
    setSelectedLog(log);
    setIsRestoreDialogOpen(true);
    setIsSuccessfullyRestored(false);
  };

  const confirmRestore = () => {
    if (!selectedLog) return;
    restoreMutation.mutate({ 
      target: restoreTarget, 
      fileName: selectedLog.filename 
    });
  };

  const handleDownload = async (filename: string) => {
    try {
      const token = getAccessToken();
      const headers: Record<string, string> = {
        ...getClientPlatformHeader(),
        ...getAuthHeaders(),
      };
      const response = await fetch(`/api/backups/download/${filename}`, { headers, credentials: getFetchCredentials() });
      if (!response.ok) {
        throw new Error('فشل التنزيل');
      }
      const blob = await response.blob();
      const { downloadFile } = await import('@/utils/webview-download');
      await downloadFile(blob, filename, blob.type || 'application/octet-stream');
    } catch (error: any) {
      toast({
        title: "فشل التنزيل",
        description: error.message || "حدث خطأ أثناء تنزيل الملف",
        variant: "destructive",
      });
    }
  };

  const [analysisReport, setAnalysisReport] = useState<any[]>([]);

  const analyzeMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await apiRequest("/api/backups/analyze", "POST", { target });
      return res;
    },
    onSuccess: (data: any) => {
      setAnalysisReport(data.report || []);
      toast({ title: "اكتمل التحليل", description: "تم فحص جميع الجداول" });
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await apiRequest("/api/backups/test-connection", "POST", { target });
      return res;
    },
    onSuccess: (data: any) => {
      toast({ 
        title: data.success ? "اتصال ناجح" : "فشل الاتصال", 
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (filename: string) => {
      const res = await apiRequest(`/api/backups/${filename}`, "DELETE");
      return res;
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "تم الحذف بنجاح", 
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.backupsLogs });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.backupsStatus });
    },
    onError: (error: any) => {
      toast({ 
        title: "فشل الحذف", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const filteredLogs = useMemo(() => {
    return logs.filter((log: any) => {
      const matchesSearch = !searchValue || 
        log.filename.toLowerCase().includes(searchValue.toLowerCase());
      const matchesStatus = filterValues.status === "all" || log.status === filterValues.status;
      return matchesSearch && matchesStatus;
    });
  }, [logs, searchValue, filterValues.status]);

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'لم يتم بعد';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  };

  const avgDuration = useMemo(() => {
    const durations = logs.filter(l => l.durationMs != null).map(l => l.durationMs!);
    if (durations.length === 0) return '-';
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    return formatDuration(avg);
  }, [logs]);

  const statsConfig: StatsRowConfig[] = [
    {
      columns: 4,
      gap: 'sm',
      items: [
        {
          key: "scheduler",
          label: "الجدولة التلقائية",
          value: backupStatus?.schedulerEnabled ? "نشطة" : "متوقفة",
          icon: Clock,
          color: backupStatus?.schedulerEnabled ? "green" : "orange",
          subLabel: backupStatus?.cronSchedule || '-'
        },
        {
          key: "last_backup",
          label: "آخر نسخ ناجح",
          value: formatTimeAgo(backupStatus?.lastSuccessAt || null),
          icon: CheckCircle2,
          color: backupStatus?.lastSuccessAt ? "green" : "gray",
          subLabel: `نجاح: ${backupStatus?.totalSuccess || 0} | فشل: ${backupStatus?.totalFailure || 0}`
        },
        {
          key: "storage",
          label: "التخزين",
          value: storageInfo ? `${storageInfo.totalSizeMB} MB` : '-',
          icon: HardDrive,
          color: "purple",
          subLabel: `${storageInfo?.fileCount || logs.length} ملف | احتفاظ: ${storageInfo?.maxRetention || 20}`
        },
        {
          key: "status",
          label: "الحالة",
          value: backupStatus?.isRunning ? "قيد التشغيل" : "جاهز",
          icon: Activity,
          color: backupStatus?.isRunning ? "orange" : "green",
          subLabel: backupStatus?.lastError ? `خطأ: ${backupStatus.lastError.substring(0, 30)}` : "لا أخطاء"
        }
      ]
    },
    {
      columns: 4,
      gap: 'sm',
      items: [
        {
          key: "avg_duration",
          label: "متوسط المدة",
          value: avgDuration,
          icon: Clock,
          color: "blue",
        },
        {
          key: "latest_size",
          label: "آخر حجم نسخة",
          value: logs[0]?.size ? `${logs[0].size} MB` : '-',
          icon: FileArchive,
          color: "indigo",
        },
        {
          key: "total_rows",
          label: "إجمالي الصفوف",
          value: logs[0]?.totalRows ? logs[0].totalRows.toLocaleString() : '-',
          icon: Database,
          color: "emerald",
        },
        {
          key: "databases",
          label: "قواعد البيانات",
          value: availableDatabases.length,
          icon: Server,
          color: "purple",
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
        searchPlaceholder="البحث في النسخ الاحتياطية..."
        resultsSummary={{
          totalCount: logs.length,
          filteredCount: filteredLogs.length,
          totalLabel: 'إجمالي النسخ',
          filteredLabel: 'نتائج البحث',
          totalValue: storageInfo?.totalSizeMB ? `${storageInfo.totalSizeMB} MB` : '-',
          totalValueLabel: 'الحجم الكلي',
        }}
        actions={[
          {
            key: "export-pdf",
            icon: FileText,
            label: "تصدير PDF",
            onClick: () => {
              toast({ title: "قريباً", description: "تصدير PDF للنسخ الاحتياطية قيد التطوير" });
            },
            variant: "outline" as const,
            disabled: filteredLogs.length === 0,
          },
          {
            key: "export-excel",
            icon: Download,
            label: "تصدير Excel",
            onClick: () => {
              toast({ title: "قريباً", description: "تصدير Excel للنسخ الاحتياطية قيد التطوير" });
            },
            variant: "outline" as const,
            disabled: filteredLogs.length === 0,
          },
          {
            key: "run-backup",
            label: backupMutation.isPending || backupStatus?.isRunning ? "جاري النسخ..." : "نسخة احتياطية جديدة",
            icon: backupMutation.isPending || backupStatus?.isRunning ? Loader2 : Archive,
            onClick: () => backupMutation.mutate(),
            disabled: backupMutation.isPending || backupStatus?.isRunning,
            variant: "default" as const
          }
        ]}
      />
      
      {(backupMutation.isPending || backupStatus?.isRunning) && (
        <div className="px-4 mt-4" data-testid="backup-progress">
          <div className="bg-card border rounded-md p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">جاري معالجة النسخة الاحتياطية...</span>
              </div>
            </div>
            <Progress value={backupMutation.isPending ? 50 : 0} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              يتم نسخ جميع الجداول وضغطها بصيغة gzip
            </p>
          </div>
        </div>
      )}
      
      <div className="mt-6 px-4">
        {isLoading && logs.length === 0 ? (
          <UnifiedCardGrid columns={3}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <UnifiedCardSkeleton key={i} compact />
            ))}
          </UnifiedCardGrid>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-md bg-muted/5">
            <HardDrive className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground" data-testid="text-no-backups">لا توجد نسخ احتياطية</h3>
            <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto mt-2">
              اضغط على "نسخة احتياطية جديدة" لإنشاء أول نسخة
            </p>
          </div>
        ) : (
          <UnifiedCardGrid columns={3}>
            {filteredLogs.map((log) => (
              <UnifiedCard
                key={log.filename}
                title={log.filename}
                titleIcon={log.compressed ? FileArchive : FileText}
                headerColor={log.status === 'success' ? '#22c55e' : '#ef4444'}
                badges={[
                  { label: log.status === 'success' ? 'ناجحة' : 'فاشلة', variant: log.status === 'success' ? 'success' : 'destructive' },
                  { label: log.format === 'json.gz' ? 'مضغوط' : log.format, variant: 'secondary' },
                ]}
                fields={[
                  { label: 'الحجم', value: log.size + ' MB', icon: HardDrive, color: 'info' },
                  { label: 'الجداول', value: log.tablesCount ?? '-', icon: Database, color: 'success' },
                  { label: 'الصفوف', value: log.totalRows ? log.totalRows.toLocaleString() : '-', icon: Activity, color: 'warning' },
                  { label: 'المدة', value: formatDuration(log.durationMs), icon: Clock, color: 'muted' },
                  { label: 'التاريخ', value: formatDate(log.created_at), icon: Calendar, color: 'info' },
                  { label: 'المسؤول', value: log.triggeredBy === 'auto' || log.triggeredBy === 'scheduler' ? 'تلقائي' : log.triggeredBy || 'غير محدد', icon: User, color: log.triggeredBy === 'auto' || log.triggeredBy === 'scheduler' ? 'muted' : 'info' },
                ]}
                actions={[
                  { icon: Download, label: 'تنزيل', onClick: () => handleDownload(log.filename), color: 'blue' },
                  { icon: RotateCcw, label: 'استعادة', onClick: () => handleRestoreClick(log), disabled: restoreMutation.isPending, color: 'orange' },
                  { icon: Trash2, label: 'حذف', onClick: () => {
                    const { dismiss } = toast({
                      title: "تأكيد الحذف",
                      description: `هل تريد حذف ${log.filename} نهائياً؟`,
                      action: (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => {
                            dismiss();
                            deleteMutation.mutate(log.filename);
                          }}
                        >
                          حذف
                        </Button>
                      ),
                    });
                  }, disabled: deleteMutation.isPending, color: 'red' },
                ]}
                compact
                data-testid={`card-backup-${log.filename}`}
              />
            ))}
          </UnifiedCardGrid>
        )}
      </div>

      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-600" />
              استعادة النسخة الاحتياطية
            </DialogTitle>
            <DialogDescription className="text-right">
              استعادة البيانات من: <br/>
              <span className="font-mono text-xs text-primary font-bold">{selectedLog?.filename}</span>
              {selectedLog?.tablesCount && (
                <span className="block mt-1 text-xs">
                  {selectedLog.tablesCount} جدول | {selectedLog.totalRows?.toLocaleString()} صف | {selectedLog.size} MB
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <label className="text-sm font-bold block text-right flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                قاعدة البيانات المستهدفة:
              </label>
              <div className="flex gap-2">
                <Select 
                  value={restoreTarget} 
                  onValueChange={(val: any) => setRestoreTarget(val)}
                >
                  <SelectTrigger className="w-full" data-testid="select-restore-target">
                    <SelectValue placeholder="اختر القاعدة" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDatabases.map((db: any) => (
                      <SelectItem key={db.id} value={db.id}>
                        <div className="flex items-center gap-2">
                          {db.id === 'central' ? <Globe className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                          <span className="font-bold">{db.name}</span>
                          <span className="text-xs text-muted-foreground">({db.id})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon"
                  data-testid="button-test-connection"
                  onClick={() => testConnectionMutation.mutate(restoreTarget)}
                  disabled={testConnectionMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 ${testConnectionMutation.isPending ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <Button 
                variant="secondary" 
                className="w-full text-xs"
                data-testid="button-analyze-tables"
                onClick={() => analyzeMutation.mutate(restoreTarget)}
                disabled={analyzeMutation.isPending}
              >
                {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <ShieldCheck className="h-4 w-4 ml-2" />}
                فحص هيكل الجداول قبل الاستعادة
              </Button>

              {analysisReport.length > 0 && (
                <div className="space-y-2">
                  <div className="max-h-48 overflow-y-auto p-3 bg-muted/30 rounded-md border text-xs space-y-1">
                    <p className="font-bold mb-2 flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      تقرير تحليل الجداول ({analysisReport.length} جدول):
                    </p>
                    {analysisReport.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                        <span className="font-mono">{item.table}</span>
                        <div className="flex items-center gap-2">
                          {item.rows !== undefined && <span className="text-muted-foreground">{item.rows} صف</span>}
                          {item.status === 'exists' ? (
                            <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-md text-[10px] font-bold">موجود</span>
                          ) : (
                            <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-md text-[10px] font-bold">مفقود</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {restoreMutation.isPending && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-primary">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    جاري الاستعادة...
                  </span>
                </div>
                <Progress value={50} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  يتم استعادة الجداول والبيانات...
                </p>
              </div>
            )}

            {isSuccessfullyRestored && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-800 flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-800 dark:text-green-200">
                    تمت الاستعادة بنجاح
                  </p>
                  <p className="text-xs text-green-600/80 mt-1">
                    سيتم إعادة تحميل النظام لتطبيق التغييرات
                  </p>
                </div>
              </div>
            )}
            
            {!restoreMutation.isPending && !isSuccessfullyRestored && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
                  تحذير: سيتم استبدال جميع البيانات الحالية في القاعدة المختارة. تأكد من صحة اختيارك.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 sm:justify-start">
            <Button 
              variant="outline" 
              onClick={() => setIsRestoreDialogOpen(false)}
              data-testid="button-cancel-restore"
              disabled={restoreMutation.isPending || isSuccessfullyRestored}
            >
              إلغاء
            </Button>
            <Button 
              variant="default" 
              data-testid="button-confirm-restore"
              onClick={confirmRestore}
              disabled={restoreMutation.isPending || isSuccessfullyRestored}
            >
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الاستعادة...
                </>
              ) : (
                <>
                  <RotateCcw className="ml-2 h-4 w-4" />
                  تأكيد الاستعادة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
