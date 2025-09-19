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
    refetchInterval: 30000, // تحديث كل 30 ثانية لتقليل الحمولة
  });

  // جلب حالة المهمة النشطة
  const { data: activeJobData, isLoading: activeJobLoading } = useQuery({
    queryKey: ['/api/migration/status', activeJobId],
    enabled: !!activeJobId,
    refetchInterval: 15000, // تحديث كل 15 ثانية لتقليل الحمولة
  });

  // متابعة المهمة النشطة تلقائياً
  useEffect(() => {
    // توحيد منطق الوصول للبيانات - استخدام jobsData?.data بدلاً من Array.isArray
    const jobs = (jobsData as any)?.data || [];
    if (jobs.length > 0) {
      const runningJob = jobs.find((job: MigrationJob) => job.status === 'running');
      if (runningJob && runningJob.id !== activeJobId) {
        console.log('🎯 تم اكتشاف مهمة نشطة جديدة:', runningJob.id);
        setActiveJobId(runningJob.id);
      } else if (!runningJob && activeJobId) {
        // المهمة انتهت، استمر في المراقبة لفترة قصيرة
        console.log('⏰ إنهاء تتبع المهمة النشطة:', activeJobId);
        setTimeout(() => setActiveJobId(null), 5000);
      }
    } else if (activeJobId && !jobsLoading) {
      // في حالة عدم وجود مهام وتوقف التحميل، إلغاء التتبع
      console.log('🧹 تنظيف تتبع المهمة النشطة - لا توجد مهام');
      setTimeout(() => setActiveJobId(null), 2000);
    }
  }, [jobsData, activeJobId, jobsLoading]);

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

  const currentJob: MigrationJob | null = (activeJobData as any)?.data || null;
  const allJobs: MigrationJob[] = (jobsData as any)?.data || [];

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

  // حالة التحميل العام عند عدم وجود بيانات
  if (jobsLoading && allJobs.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6 bg-white dark:bg-black text-black dark:text-white">
        <div className="flex items-center gap-3 mb-6">
          <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold">لوحة تحكم هجرة البيانات</h1>
            <p className="text-gray-600 dark:text-gray-400">
              جاري تحميل بيانات الهجرة...
            </p>
          </div>
        </div>
        
        {/* Skeleton للإعدادات */}
        <div className="space-y-4">
          <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

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
      {activeJobLoading && activeJobId && (
        <Card className="border-2 border-gray-300 dark:border-gray-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                جاري تحميل بيانات المهمة...
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              <div className="grid grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ))}
              </div>
              <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      )}
      
      {currentJob && !activeJobLoading && (
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
                <div className="flex items-center gap-4">
                  {currentJob.estimatedTimeRemaining && currentJob.estimatedTimeRemaining > 0 && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                      <Clock className="h-3 w-3" />
                      متبقي: {formatDuration(currentJob.estimatedTimeRemaining * 1000)}
                    </span>
                  )}
                  {currentJob.duration && currentJob.duration > 0 && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                      <Activity className="h-3 w-3" />
                      منقضي: {formatDuration(currentJob.duration)}
                    </span>
                  )}
                </div>
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
            {currentJob.tableProgress.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  تقدم الجداول ({currentJob.tableProgress.length})
                </h4>
                <div className="max-h-60 overflow-y-auto border rounded-md">
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
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>لا توجد تفاصيل جداول متاحة حالياً</p>
                <p className="text-sm">ستظهر التفاصيل عند بدء عملية الهجرة</p>
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
          {jobsLoading && allJobs.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                جاري تحميل تاريخ المهام...
              </div>
            </div>
          ) : allJobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مهام هجرة بعد</h3>
              <p className="text-sm">ابدأ عملية هجرة جديدة لرؤية التقدم هنا</p>
              <Button 
                onClick={handleStartMigration} 
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-start-first-migration"
              >
                <Play className="h-4 w-4 mr-2" />
                بدء أول عملية هجرة
              </Button>
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