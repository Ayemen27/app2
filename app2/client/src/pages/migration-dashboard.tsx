import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Square, 
  Database, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Activity,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Types
interface MigrationTableProgress {
  tableName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  totalRows: number;
  processedRows: number;
  savedRows: number;
  errors: number;
  startTime?: string;
  endTime?: string;
  errorMessage?: string;
}

interface MigrationJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  currentTable?: string;
  tablesProcessed: number;
  totalTables: number;
  totalRowsProcessed: number;
  totalRowsSaved: number;
  totalErrors: number;
  progress: number;
  tableProgress: MigrationTableProgress[];
  error?: string;
  estimatedTimeRemaining?: number;
  duration?: number;
}

export default function MigrationDashboard() {
  const [batchSize, setBatchSize] = useState(100);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // جلب قائمة جميع المهام
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/migration/jobs'],
    refetchInterval: 5000, // تحديث كل 5 ثواني
  });

  // جلب حالة المهمة النشطة
  const { data: activeJobData, isLoading: activeJobLoading } = useQuery({
    queryKey: ['/api/migration/status', activeJobId],
    enabled: !!activeJobId,
    refetchInterval: 2000, // تحديث كل ثانيتين
  });

  // متابعة المهمة النشطة تلقائياً
  useEffect(() => {
    if (jobsData?.data) {
      const runningJob = jobsData.data.find((job: MigrationJob) => job.status === 'running');
      if (runningJob && runningJob.id !== activeJobId) {
        setActiveJobId(runningJob.id);
      } else if (!runningJob && activeJobId) {
        // المهمة انتهت، استمر في المراقبة لفترة قصيرة
        setTimeout(() => setActiveJobId(null), 5000);
      }
    }
  }, [jobsData, activeJobId]);

  // بدء مهمة هجرة جديدة
  const startMigrationMutation = useMutation({
    mutationFn: async ({ batchSize }: { batchSize: number }) => {
      return await apiRequest('/api/migration/start', 'POST', { batchSize });
    },
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast({
        title: "تم بدء الهجرة",
        description: `معرف المهمة: ${data.jobId}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/migration/jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في بدء الهجرة",
        description: error.message || "فشل في بدء عملية الهجرة",
        variant: "destructive",
      });
    }
  });

  // إيقاف مهمة الهجرة
  const stopMigrationMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return await apiRequest(`/api/migration/stop/${jobId}`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "تم إيقاف الهجرة",
        description: "تم إلغاء عملية الهجرة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/migration/jobs'] });
      setTimeout(() => setActiveJobId(null), 1000);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إيقاف الهجرة",
        description: error.message || "فشل في إيقاف العملية",
        variant: "destructive",
      });
    }
  });

  const currentJob: MigrationJob | null = activeJobData?.data || null;
  const allJobs: MigrationJob[] = jobsData?.data || [];

  const handleStartMigration = () => {
    startMigrationMutation.mutate({ batchSize });
  };

  const handleStopMigration = () => {
    if (activeJobId) {
      stopMigrationMutation.mutate(activeJobId);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}س ${minutes % 60}د ${seconds % 60}ث`;
    } else if (minutes > 0) {
      return `${minutes}د ${seconds % 60}ث`;
    } else {
      return `${seconds}ث`;
    }
  };

  const getStatusBadge = (status: MigrationJob['status']) => {
    const config = {
      pending: { color: 'bg-gray-500', text: 'في الانتظار', icon: Clock },
      running: { color: 'bg-blue-500', text: 'قيد التشغيل', icon: Activity },
      completed: { color: 'bg-green-500', text: 'مكتمل', icon: CheckCircle2 },
      failed: { color: 'bg-red-500', text: 'فشل', icon: XCircle },
      cancelled: { color: 'bg-orange-500', text: 'ملغي', icon: AlertCircle },
    };
    
    const { color, text, icon: Icon } = config[status];
    
    return (
      <Badge className={`${color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {text}
      </Badge>
    );
  };

  const getTableStatusBadge = (status: MigrationTableProgress['status']) => {
    const config = {
      pending: { color: 'bg-gray-400', text: 'انتظار' },
      processing: { color: 'bg-blue-500', text: 'معالجة' },
      completed: { color: 'bg-green-500', text: 'مكتمل' },
      failed: { color: 'bg-red-500', text: 'فشل' },
      skipped: { color: 'bg-yellow-500', text: 'تم التخطي' },
    };
    
    const { color, text } = config[status];
    
    return (
      <Badge className={`${color} text-white text-xs`}>
        {text}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6 bg-white dark:bg-black text-black dark:text-white">
      {/* العنوان الرئيسي */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold">لوحة تحكم هجرة البيانات</h1>
            <p className="text-gray-600 dark:text-gray-400">
              مراقبة وإدارة عمليات هجرة البيانات من Supabase إلى قاعدة البيانات المحلية
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => queryClient.invalidateQueries()}
            variant="outline"
            size="sm"
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            تحديث
          </Button>
          
          {!currentJob || currentJob.status !== 'running' ? (
            <Button
              onClick={handleStartMigration}
              disabled={startMigrationMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-start-migration"
            >
              {startMigrationMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  بدء...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  بدء الهجرة
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleStopMigration}
              disabled={stopMigrationMutation.isPending}
              variant="destructive"
              data-testid="button-stop-migration"
            >
              <Square className="h-4 w-4 mr-2" />
              إيقاف الهجرة
            </Button>
          )}
        </div>
      </div>

      {/* إعدادات الهجرة */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الهجرة</CardTitle>
          <CardDescription>تكوين معاملات عملية الهجرة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="batch-size">حجم الدفعة:</Label>
              <Input
                id="batch-size"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 100)}
                min={50}
                max={500}
                className="w-20"
                data-testid="input-batch-size"
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              عدد الصفوف التي يتم معالجتها في كل دفعة
            </p>
          </div>
        </CardContent>
      </Card>

      {/* حالة الهجرة النشطة */}
      {currentJob && (
        <Card className="border-2 border-blue-500 dark:border-blue-400">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                الهجرة النشطة - {currentJob.id.split('_')[2]?.substr(0, 6) || currentJob.id.substr(-6)}
              </CardTitle>
              {getStatusBadge(currentJob.status)}
            </div>
            <CardDescription>
              {currentJob.currentTable && `الجدول الحالي: ${currentJob.currentTable}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* شريط التقدم العام */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">التقدم العام</span>
                <span className="text-sm text-gray-600">{currentJob.progress}%</span>
              </div>
              <Progress 
                value={currentJob.progress} 
                className="w-full h-3" 
                data-testid="progress-overall"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>{currentJob.tablesProcessed} من {currentJob.totalTables} جدول</span>
                {currentJob.estimatedTimeRemaining && currentJob.estimatedTimeRemaining > 0 && (
                  <span>الوقت المتبقي: {formatDuration(currentJob.estimatedTimeRemaining * 1000)}</span>
                )}
              </div>
            </div>

            {/* الإحصائيات */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {currentJob.totalRowsProcessed.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">صفوف معالجة</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {currentJob.totalRowsSaved.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">صفوف محفوظة</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {currentJob.totalErrors}
                </div>
                <div className="text-sm text-gray-600">أخطاء</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {formatDuration(currentJob.duration || 0)}
                </div>
                <div className="text-sm text-gray-600">المدة</div>
              </div>
            </div>

            {/* تفاصيل الجداول */}
            {currentJob.tableProgress.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  تقدم الجداول
                </h4>
                <div className="max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الجدول</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>الصفوف</TableHead>
                        <TableHead>المعالجة</TableHead>
                        <TableHead>المحفوظة</TableHead>
                        <TableHead>الأخطاء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentJob.tableProgress.map((table, index) => (
                        <TableRow key={index} className={table.status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/10' : ''}>
                          <TableCell className="font-medium">{table.tableName}</TableCell>
                          <TableCell>{getTableStatusBadge(table.status)}</TableCell>
                          <TableCell>{table.totalRows.toLocaleString()}</TableCell>
                          <TableCell>{table.processedRows.toLocaleString()}</TableCell>
                          <TableCell>{table.savedRows.toLocaleString()}</TableCell>
                          <TableCell>
                            {table.errors > 0 && (
                              <span className="text-red-600 font-medium">{table.errors}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* تاريخ المهام */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            تاريخ مهام الهجرة
          </CardTitle>
          <CardDescription>جميع عمليات الهجرة السابقة</CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="text-center py-8">جاري تحميل المهام...</div>
          ) : allJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد مهام هجرة
            </div>
          ) : (
            <div className="space-y-3">
              {allJobs.map((job, index) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  data-testid={`job-${index}`}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium">
                        {job.id.split('_')[2]?.substr(0, 6) || job.id.substr(-6)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(job.startTime).toLocaleString('ar-EG')}
                      </div>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm">
                      {job.totalRowsProcessed.toLocaleString()} صف معالج
                    </div>
                    <div className="text-xs text-gray-600">
                      {job.tablesProcessed}/{job.totalTables} جدول
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm">
                      {formatDuration(job.duration || (Date.now() - new Date(job.startTime).getTime()))}
                    </div>
                    {job.totalErrors > 0 && (
                      <div className="text-xs text-red-600">
                        {job.totalErrors} خطأ
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => setActiveJobId(job.id)}
                    variant="outline"
                    size="sm"
                    data-testid={`button-view-job-${index}`}
                  >
                    عرض التفاصيل
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}