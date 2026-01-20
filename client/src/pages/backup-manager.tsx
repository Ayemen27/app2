import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Database, 
  Download, 
  RotateCcw, 
  ShieldCheck, 
  History,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { UnifiedCard } from "@/components/ui/unified-card";

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

  const { data: logsResponse, isLoading, refetch } = useQuery<BackupLogsResponse>({
    queryKey: ["/api/backups/logs"],
    refetchInterval: 30000,
  });

  const logs = useMemo(() => logsResponse?.data || [], [logsResponse]);

  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/backups/run");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backups/logs"] });
      toast({ 
        title: "تم بدء العملية", 
        description: "يتم الآن إنشاء النسخة الاحتياطية ورفعها إلى السحابة",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "فشل العملية", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/backups/restore/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "تمت الاستعادة بنجاح", 
        description: "تمت استعادة قاعدة البيانات، سيتم تحديث الصفحة الآن",
        className: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
      });
      setTimeout(() => window.location.reload(), 2000);
    },
    onError: (error: any) => {
      toast({ 
        title: "فشل الاستعادة", 
        description: error.message,
        variant: "destructive" 
      });
    },
    onSettled: () => setIsRestoring(null)
  });

  const lastBackup = logs.find(l => l.status === 'success');

  const stats = useMemo(() => [
    {
      title: "حالة النظام",
      value: "نشط",
      icon: ShieldCheck,
      color: "green",
      description: "النسخ التلقائي مفعل"
    },
    {
      title: "آخر نسخة ناجحة",
      value: lastBackup ? formatDate(lastBackup.createdAt) : "لا يوجد",
      icon: Clock,
      color: "blue",
      description: lastBackup ? lastBackup.filename : "في انتظار أول نسخة"
    },
    {
      title: "إجمالي النسخ",
      value: String(logs.length),
      icon: History,
      color: "purple",
      description: "سجل العمليات الكامل"
    }
  ], [logs, lastBackup]);

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto fade-in" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            إدارة النسخ الاحتياطي
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تأمين بيانات النظام عبر التخزين السحابي المزدوج (Google Drive & Telegram)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="hover-elevate"
          >
            <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث السجل
          </Button>
          
          <Button 
            onClick={() => backupMutation.mutate()} 
            disabled={backupMutation.isPending}
            className="gap-2 hover-elevate active-elevate-2 shadow-lg shadow-primary/20"
          >
            {backupMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            إنشاء نسخة فورية
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <UnifiedStats stats={stats} columns={3} />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6">
        <UnifiedCard
          title="سجل النسخ الاحتياطية"
          titleIcon={History}
          description="عرض وتحميل واستعادة النسخ الاحتياطية السابقة"
        >
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                <p className="text-sm text-muted-foreground">جاري جلب السجلات...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <HardDrive className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-muted-foreground">لا يوجد سجلات حتى الآن</h3>
                <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto mt-1">
                  ابدأ بإنشاء أول نسخة احتياطية يدوية باستخدام الزر أعلاه
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead className="text-right w-[180px]">التاريخ والوقت</TableHead>
                    <TableHead className="text-right">تفاصيل النسخة</TableHead>
                    <TableHead className="text-center">الوجهة</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{new Date(log.createdAt).toLocaleDateString('ar-SA')}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(log.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[11px] max-w-[200px] truncate" title={log.filename}>
                            {log.filename}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-normal py-0">
                              {log.size} MB
                            </Badge>
                            {log.triggeredBy && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <ExternalLink className="h-2 w-2" />
                                {log.triggeredBy === 'system' ? 'تلقائي' : 'يدوي'}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Cloud
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            Chat
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {log.status === 'success' ? (
                          <div className="flex items-center justify-center gap-1 text-green-600 font-medium text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>ناجحة</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1 text-red-600 font-medium text-xs" title={log.errorMessage}>
                            <div className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              <span>فاشلة</span>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            title="تحميل النسخة"
                            asChild
                          >
                            <a href={`/api/backups/download/${log.id}`} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                            disabled={isRestoring !== null}
                            onClick={() => {
                              if (window.confirm("تحذير حرج: هل أنت متأكد من رغبتك في استعادة هذه النسخة؟ سيتم الكتابة فوق جميع البيانات الحالية ولا يمكن التراجع عن هذا الإجراء.")) {
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </UnifiedCard>
        
        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30">
            <CardContent className="p-4 flex gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">أمان البيانات المزدوج</h4>
                <p className="text-xs text-blue-700/80 dark:text-blue-400/70 leading-relaxed">
                  نظامنا يقوم برفع النسخ الاحتياطية إلى Google Drive كوجهة أساسية وإرسال تقرير فوري إلى Telegram لضمان عدم ضياع البيانات تحت أي ظرف.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30">
            <CardContent className="p-4 flex gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300">الجدولة التلقائية</h4>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/70 leading-relaxed">
                  يتم تنفيذ عملية النسخ الاحتياطي آلياً كل 24 ساعة في الساعة 12 منتصف الليل لضمان حفظ بيانات اليوم السابق بالكامل.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
