import { useState, useMemo, useCallback } from "react";
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
  FileText
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { Button } from "@/components/ui/button";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";

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

interface BackupLogsResponse {
  success: boolean;
  data: BackupLog[];
}

export default function BackupManager() {
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: "all",
  });

  const { data: logsResponse, isLoading, refetch } = useQuery<BackupLogsResponse>({
    queryKey: ["/api/backups/logs"],
    refetchInterval: 30000,
  });

  const logs = useMemo(() => logsResponse?.data || [], [logsResponse]);

  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/backups/run", "POST");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backups/logs"] });
      toast({ 
        title: "بدأت العملية بنجاح", 
        description: "يتم الآن تأمين بياناتك سحابياً",
      });
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
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/backups/restore/${id}`, "POST");
      return res;
    },
    onSuccess: () => {
      toast({ 
        title: "اكتملت الاستعادة", 
        description: "تمت استعادة البيانات، جاري إعادة التشغيل...",
      });
      setTimeout(() => window.location.reload(), 2000);
    },
    onSettled: () => setIsRestoring(null)
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
    <div className="fade-in pb-10" dir="rtl">
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
        isRefreshing={isLoading}
        searchPlaceholder="البحث في أسماء الملفات..."
        actions={[
          {
            key: "run-backup",
            label: "نسخة فورية",
            icon: backupMutation.isPending ? RefreshCw : ShieldCheck,
            onClick: () => backupMutation.mutate(),
            disabled: backupMutation.isPending,
            variant: "default"
          }
        ]}
      />
      
      <div className="mt-6 px-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/10">
            <HardDrive className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">لا توجد نتائج</h3>
            <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto mt-2">
              لم نجد أي سجلات تطابق بحثك الحالي، حاول تغيير الفلتر أو إنشاء نسخة جديدة.
            </p>
          </div>
        ) : (
          <UnifiedCardGrid columns={3}>
            {filteredLogs.map((log) => (
              <UnifiedCard
                key={log.id}
                title={log.filename}
                titleIcon={FileText}
                headerColor={log.status === 'success' ? '#10b981' : '#ef4444'}
                badges={[
                  { 
                    label: log.status === 'success' ? 'ناجحة' : 'فاشلة', 
                    variant: log.status === 'success' ? 'success' : 'destructive' 
                  },
                  { 
                    label: `${log.size} MB`, 
                    variant: 'outline' 
                  }
                ]}
                fields={[
                  {
                    label: "التاريخ",
                    value: formatDate(log.createdAt),
                    icon: Clock
                  },
                  {
                    label: "النوع",
                    value: log.triggeredBy === 'system' ? 'تلقائي' : 'يدوي',
                    icon: Database
                  }
                ]}
                className="hover-elevate h-full"
                footer={
                  <div className="flex w-full gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1 h-9"
                      asChild
                    >
                      <a href={`/api/backups/download/${log.id}`} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5" />
                        تحميل
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 gap-1 h-9 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                      disabled={isRestoring !== null}
                      onClick={() => {
                        if (window.confirm("هل أنت متأكد؟ هذا الإجراء سيقوم باستبدال كافة البيانات الحالية بالنسخة المختارة.")) {
                          setIsRestoring(log.id);
                          restoreMutation.mutate(log.id);
                        }
                      }}
                    >
                      {isRestoring === log.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      استعادة
                    </Button>
                  </div>
                }
              />
            ))}
          </UnifiedCardGrid>
        )}
      </div>
    </div>
  );
}
