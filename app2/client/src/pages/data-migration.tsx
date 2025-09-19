import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatsCard } from "@/components/ui/stats-card";
import { 
  Database, 
  Download, 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Activity,
  ArrowRight,
  Filter,
  Search,
  Save,
  Undo,
  Server,
  HardDrive,
  Wifi,
  WifiOff,
  FileText,
  Trash2,
  Copy,
  Upload,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// أنواع البيانات للهجرة
interface MigrationTable {
  name: string;
  displayName: string;
  category: string;
  estimatedRows: number;
  actualRows?: number;
  columnCount?: number;
  columns?: string[];
  description?: string;
  size?: string;
  status: 'ready' | 'migrating' | 'completed' | 'failed';
  priority: number;
}

interface MigrationJob {
  id: string;
  tableName: string;
  status: 'started' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  processedRows: number;
  totalRows: number;
  startedAt: string;
  errors: any[];
}

interface MigrationStatus {
  id: string;
  status: string;
  progress: number;
  currentTable: string;
  processedRows: number;
  totalRows: number;
  completedTables: string[];
  remainingTables: string[];
  errors: any[];
  startedAt: string;
  estimatedCompletion: string;
}

// تعريف أنواع البيانات للإحصائيات العامة
interface GeneralStats {
  estimatedDataSize?: number | string;
  totalTables?: number;
  totalRecords?: number;
  databaseSize?: string;
  lastUpdated?: string;
  [key: string]: any;
}

// تعريف أنواع البيانات لحالة الاتصال
interface ConnectionStatus {
  connected?: boolean;
  database?: string;
  user?: string;
  version?: string;
  host?: string;
  port?: string | number;
  ssl?: boolean;
  responseTime?: number;
  error?: string;
  [key: string]: any;
}

export default function DataMigrationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // حالات الصفحة
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [migrationSettings, setMigrationSettings] = useState({
    batchSize: 100,
    delayBetweenBatches: 1000,
    maxRetries: 3
  });
  const [activeTab, setActiveTab] = useState("tables");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentMigrationId, setCurrentMigrationId] = useState<string | null>(null);

  // جلب قائمة الجداول المتاحة
  const { data: tablesData, isLoading: tablesLoading, refetch: refetchTables } = useQuery<MigrationTable[]>({
    queryKey: ['/api/migration/tables'],
    refetchInterval: 30000, // تحديث كل 30 ثانية
  });

  // جلب إحصائيات شاملة
  const { data: generalStats, refetch: refetchGeneralStats } = useQuery<GeneralStats>({
    queryKey: ['/api/migration/general-stats'],
    refetchInterval: 60000, // تحديث كل دقيقة
  });

  // فحص حالة الاتصال بقاعدة البيانات المصدر
  const { data: connectionStatus, refetch: refetchConnection } = useQuery<ConnectionStatus>({
    queryKey: ['/api/migration/connection-status'],
    refetchInterval: 30000,
  });

  // جلب حالة الهجرة الحالية
  const { data: migrationStatus, refetch: refetchStatus } = useQuery<MigrationStatus>({
    queryKey: ['/api/migration/status', currentMigrationId],
    enabled: !!currentMigrationId,
    refetchInterval: 2000, // تحديث كل ثانيتين
  });

  // Mutations للعمليات
  const startMigrationMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/migration/transfer', 'POST', data),
    onSuccess: (data) => {
      setCurrentMigrationId(data.data.id);
      setActiveTab("progress");
      toast({
        title: "✅ تم بدء الهجرة",
        description: `تم بدء هجرة ${selectedTables.length} جدول بنجاح`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "❌ فشل في بدء الهجرة",
        description: error.message || "حدث خطأ غير متوقع",
      });
    }
  });

  const stopMigrationMutation = useMutation({
    mutationFn: (jobId: string) => apiRequest(`/api/migration/stop/${jobId}`, 'POST'),
    onSuccess: () => {
      setCurrentMigrationId(null);
      refetchStatus();
      toast({
        title: "⏹️ تم إيقاف الهجرة",
        description: "تم إيقاف عملية الهجرة بنجاح",
      });
    }
  });

  // تصفية الجداول
  const filteredTables = (tablesData || []).filter((table: MigrationTable) => {
    const matchesSearch = table.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         table.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || table.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // الحصول على فئات الجداول الفريدة
  const categories = Array.from(new Set((tablesData || []).map((t: MigrationTable) => t.category)));

  // اختيار/إلغاء اختيار جدول
  const toggleTableSelection = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  // اختيار/إلغاء اختيار الكل
  const toggleSelectAll = () => {
    const allTableNames = filteredTables.map((t: MigrationTable) => t.name);
    setSelectedTables(prev => 
      prev.length === allTableNames.length ? [] : allTableNames
    );
  };

  // بدء الهجرة
  const startMigration = () => {
    if (selectedTables.length === 0) {
      toast({
        variant: "destructive",
        title: "⚠️ لا توجد جداول محددة",
        description: "يرجى اختيار جدول واحد على الأقل للهجرة",
      });
      return;
    }

    startMigrationMutation.mutate({
      tables: selectedTables,
      batchSize: migrationSettings.batchSize,
      delayBetweenBatches: migrationSettings.delayBetweenBatches
    });
  };

  // إيقاف الهجرة
  const stopMigration = () => {
    if (currentMigrationId) {
      stopMigrationMutation.mutate(currentMigrationId);
    }
  };

  // حساب الإحصائيات الشاملة
  const calculateGeneralStats = () => {
    const totalRecords = (tablesData || []).reduce((sum: number, table: MigrationTable) => 
      sum + (table.actualRows || table.estimatedRows), 0
    );
    
    // التحقق الآمن من وجود البيانات في generalStats
    let estimatedDataSize: string;
    
    if (generalStats && typeof generalStats.estimatedDataSize !== 'undefined') {
      // إذا كانت البيانات متوفرة من API
      if (typeof generalStats.estimatedDataSize === 'number') {
        estimatedDataSize = generalStats.estimatedDataSize.toFixed(2) + ' MB';
      } else {
        estimatedDataSize = String(generalStats.estimatedDataSize);
      }
    } else {
      // حساب تقديري إذا لم تكن البيانات متوفرة من API
      estimatedDataSize = (Math.round(totalRecords * 0.001 * 100) / 100) + ' MB';
    }
      
    return {
      totalTables: tablesData?.length || 0,
      selectedTables: selectedTables.length,
      readyTables: (tablesData || []).filter((t: MigrationTable) => t.status === 'ready').length,
      completedTables: (tablesData || []).filter((t: MigrationTable) => t.status === 'completed').length,
      totalRecords,
      estimatedDataSize,
      // التحقق الآمن من حالة الاتصال
      isConnected: connectionStatus && typeof connectionStatus.connected === 'boolean' 
        ? connectionStatus.connected 
        : false
    };
  };
  
  const stats = calculateGeneralStats();

  return (
    <div className="container mx-auto p-3 sm:p-6 max-w-7xl" dir="rtl">
      {/* الإحصائيات الشاملة باستخدام مكونات موحدة */}
      <div className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatsCard
            title="إجمالي الجداول"
            value={stats.totalTables}
            icon={Database}
            color="blue"
            data-testid="stat-total-tables"
          />
          <StatsCard
            title="إجمالي السجلات"
            value={stats.totalRecords.toLocaleString()}
            icon={BarChart3}
            color="green"
            data-testid="stat-total-records"
          />
          <StatsCard
            title="حجم البيانات المقدر"
            value={stats.estimatedDataSize}
            icon={HardDrive}
            color="purple"
            data-testid="stat-data-size"
          />
          <StatsCard
            title="حالة الاتصال"
            value={stats.isConnected ? 'متصل' : 'منقطع'}
            icon={stats.isConnected ? Wifi : WifiOff}
            color={stats.isConnected ? 'green' : 'red'}
            data-testid="stat-connection-status"
          />
        </div>
        
        {/* إحصائيات إضافية */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="جداول مكتملة"
            value={stats.completedTables}
            icon={CheckCircle}
            color="emerald"
            data-testid="stat-completed-tables"
          />
          <StatsCard
            title="جداول جاهزة"
            value={stats.readyTables}
            icon={Clock}
            color="orange"
            data-testid="stat-ready-tables"
          />
          <StatsCard
            title="جداول محددة"
            value={stats.selectedTables}
            icon={Activity}
            color="indigo"
            data-testid="stat-selected-tables"
          />
          <StatsCard
            title="نسبة الإكمال"
            value={`${Math.round((stats.completedTables / stats.totalTables) * 100) || 0}%`}
            icon={Activity}
            color="teal"
            data-testid="stat-completion-rate"
          />
        </div>
      </div>

      {/* علامات التبويب المحسنة */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto gap-1">
          <TabsTrigger value="tables" className="flex items-center gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Database className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">اختيار الجداول</span>
            <span className="sm:hidden">الجداول</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">الإعدادات</span>
            <span className="sm:hidden">إعدادات</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">متابعة التقدم</span>
            <span className="sm:hidden">التقدم</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Save className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">النسخ الاحتياطي</span>
            <span className="sm:hidden">نسخ</span>
          </TabsTrigger>
          <TabsTrigger value="restore" className="flex items-center gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Undo className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">الاستعادة المتقدمة</span>
            <span className="sm:hidden">استعادة</span>
          </TabsTrigger>
          <TabsTrigger value="database-mgmt" className="flex items-center gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Server className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">إدارة قواعد البيانات</span>
            <span className="sm:hidden">إدارة</span>
          </TabsTrigger>
        </TabsList>

        {/* تبويب اختيار الجداول */}
        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>الجداول المتاحة للهجرة</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      refetchTables();
                      refetchGeneralStats();
                      refetchConnection();
                    }}
                    disabled={tablesLoading}
                    data-testid="button-refresh-tables"
                  >
                    <RefreshCw className={`h-4 w-4 ${tablesLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline ml-2">تحديث</span>
                  </Button>
                </div>
              </CardTitle>
              
              {/* أدوات البحث والتصفية */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث في الجداول..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 text-sm sm:text-base"
                      data-testid="input-search-tables"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm sm:text-base"
                    data-testid="select-category-filter"
                  >
                    <option value="all">جميع الفئات</option>
                    {categories.map((category, index) => (
                      <option key={`category-${index}`} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* أدوات الاختيار */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    data-testid="button-toggle-select-all"
                    className="text-xs sm:text-sm"
                  >
                    {selectedTables.length === filteredTables.length ? 'إلغاء اختيار الكل' : 'اختيار الكل'}
                  </Button>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    محدد {selectedTables.length} من {filteredTables.length} جدول
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <ScrollArea className="h-[300px] sm:h-[400px]">
                <div className="space-y-3 sm:hidden">
                  {/* عرض البطاقات للهواتف المحمولة */}
                  {tablesLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-sm">جاري تحميل الجداول...</p>
                    </div>
                  ) : filteredTables.length === 0 ? (
                    <div className="text-center py-8">
                      <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm">لا توجد جداول متطابقة مع البحث</p>
                    </div>
                  ) : (
                    filteredTables.map((table: MigrationTable) => (
                      <Card key={table.name} className="p-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedTables.includes(table.name)}
                            onChange={() => toggleTableSelection(table.name)}
                            className="w-4 h-4 mt-1"
                            data-testid={`checkbox-table-${table.name}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm truncate">{table.displayName}</h4>
                              <Badge 
                                variant={
                                  table.status === 'ready' ? 'default' :
                                  table.status === 'completed' ? 'secondary' :
                                  table.status === 'failed' ? 'destructive' :
                                  'outline'
                                }
                                className="text-xs"
                              >
                                {table.status === 'ready' ? 'جاهز' :
                                 table.status === 'completed' ? 'مكتمل' :
                                 table.status === 'failed' ? 'فاشل' :
                                 table.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{table.name}</p>
                            {table.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{table.description}</p>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" />
                                <span>{(table.actualRows || table.estimatedRows).toLocaleString()} صف</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span>{table.columnCount || '—'} عمود</span>
                              </div>
                            </div>
                            {table.columns && table.columns.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground mb-1">الأعمدة:</p>
                                <div className="flex flex-wrap gap-1">
                                  {table.columns.slice(0, 3).map((col, index) => (
                                    <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                                      {col}
                                    </Badge>
                                  ))}
                                  {table.columns.length > 3 && (
                                    <Badge variant="outline" className="text-xs px-1 py-0">
                                      +{table.columns.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <Badge variant="outline" className="text-xs">{table.category}</Badge>
                              {table.size && (
                                <span className="text-xs text-muted-foreground">{table.size}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
                
                {/* عرض الجدول للشاشات الكبيرة */}
                <Table className="hidden sm:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">اختيار</TableHead>
                      <TableHead>معلومات الجدول</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead>البيانات</TableHead>
                      <TableHead>الأعمدة</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tablesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                          جاري تحميل الجداول...
                        </TableCell>
                      </TableRow>
                    ) : filteredTables.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          لا توجد جداول متطابقة مع البحث
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTables.map((table: MigrationTable) => (
                        <TableRow key={table.name}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedTables.includes(table.name)}
                              onChange={() => toggleTableSelection(table.name)}
                              className="w-4 h-4"
                              data-testid={`checkbox-table-${table.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{table.displayName}</p>
                              <p className="text-sm text-muted-foreground">{table.name}</p>
                              {table.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{table.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{table.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <BarChart3 className="h-3 w-3" />
                                <span>{(table.actualRows || table.estimatedRows).toLocaleString()} صف</span>
                              </div>
                              {table.size && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <HardDrive className="h-3 w-3" />
                                  <span>{table.size}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <FileText className="h-3 w-3" />
                                <span>{table.columnCount || '—'} عمود</span>
                              </div>
                              {table.columns && table.columns.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {table.columns.slice(0, 2).map((col, index) => (
                                    <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                                      {col}
                                    </Badge>
                                  ))}
                                  {table.columns.length > 2 && (
                                    <Badge variant="outline" className="text-xs px-1 py-0">
                                      +{table.columns.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                table.status === 'ready' ? 'default' :
                                table.status === 'completed' ? 'secondary' :
                                table.status === 'failed' ? 'destructive' :
                                'outline'
                              }
                            >
                              {table.status === 'ready' ? 'جاهز' :
                               table.status === 'completed' ? 'مكتمل' :
                               table.status === 'failed' ? 'فاشل' :
                               table.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* أزرار التحكم */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button
                onClick={startMigration}
                disabled={selectedTables.length === 0 || startMigrationMutation.isPending}
                size="lg"
                data-testid="button-start-migration"
              >
                <Play className="h-4 w-4 ml-2" />
                {startMigrationMutation.isPending ? 'جاري البدء...' : 'بدء الهجرة'}
              </Button>
              
              {currentMigrationId && (
                <Button
                  variant="destructive"
                  onClick={stopMigration}
                  disabled={stopMigrationMutation.isPending}
                  size="lg"
                  data-testid="button-stop-migration"
                >
                  <Square className="h-4 w-4 ml-2" />
                  إيقاف الهجرة
                </Button>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              محدد {selectedTables.length} جدول للهجرة
            </p>
          </div>
        </TabsContent>

        {/* تبويب الإعدادات */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الهجرة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="batchSize">حجم الدفعة</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    value={migrationSettings.batchSize}
                    onChange={(e) => setMigrationSettings(prev => ({
                      ...prev,
                      batchSize: parseInt(e.target.value) || 100
                    }))}
                    min={10}
                    max={1000}
                    data-testid="input-batch-size"
                  />
                  <p className="text-xs text-muted-foreground">
                    عدد الصفوف في كل دفعة (10-1000)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delay">التأخير بين الدفعات (مللي ثانية)</Label>
                  <Input
                    id="delay"
                    type="number"
                    value={migrationSettings.delayBetweenBatches}
                    onChange={(e) => setMigrationSettings(prev => ({
                      ...prev,
                      delayBetweenBatches: parseInt(e.target.value) || 1000
                    }))}
                    min={100}
                    max={10000}
                    data-testid="input-delay"
                  />
                  <p className="text-xs text-muted-foreground">
                    فترة الانتظار بين كل دفعة (100-10000ms)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retries">محاولات إعادة التجربة</Label>
                  <Input
                    id="retries"
                    type="number"
                    value={migrationSettings.maxRetries}
                    onChange={(e) => setMigrationSettings(prev => ({
                      ...prev,
                      maxRetries: parseInt(e.target.value) || 3
                    }))}
                    min={1}
                    max={10}
                    data-testid="input-max-retries"
                  />
                  <p className="text-xs text-muted-foreground">
                    عدد محاولات إعادة التجربة للدفعات الفاشلة (1-10)
                  </p>
                </div>
              </div>

              <Separator />

              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>نصائح للإعدادات الأمثل:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• استخدم حجم دفعة أصغر (50-100) للجداول الكبيرة لتجنب timeout</li>
                    <li>• زد التأخير بين الدفعات (2000-3000ms) إذا كانت هناك مشاكل في الاتصال</li>
                    <li>• حدد عدد محاولات أكثر (5-7) للشبكات البطيئة</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب متابعة التقدم */}
        <TabsContent value="progress" className="space-y-4">
          {currentMigrationId ? (
            <MigrationProgressDisplay 
              migrationStatus={migrationStatus}
              onRefresh={() => refetchStatus()}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">لا توجد عملية هجرة جارية</h3>
                <p className="text-muted-foreground mb-4">
                  اذهب إلى تبويب "اختيار الجداول" لبدء عملية هجرة جديدة
                </p>
                <Button onClick={() => setActiveTab("tables")}>
                  <ArrowRight className="h-4 w-4 ml-2" />
                  اختيار الجداول
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* تبويب النسخ الاحتياطي المحلي */}
        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                النسخ الاحتياطي المحلي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8">
                <Save className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">إنشاء نسخة احتياطية محلية</h3>
                <p className="text-muted-foreground mb-6">
                  قم بإنشاء نسخة احتياطية كاملة من قاعدة البيانات المحلية للحماية من فقدان البيانات
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                  <Button variant="outline" data-testid="button-create-backup">
                    <Download className="h-4 w-4 ml-2" />
                    إنشاء نسخة احتياطية
                  </Button>
                  <Button variant="outline" data-testid="button-schedule-backup">
                    <Clock className="h-4 w-4 ml-2" />
                    جدولة النسخ الاحتياطي
                  </Button>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-3">النسخ الاحتياطية المحفوظة</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">نسخة احتياطية يومية</p>
                      <p className="text-sm text-muted-foreground">تم إنشاؤها في 18 سبتمبر 2025</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" data-testid="button-download-backup">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" data-testid="button-delete-backup">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب الاستعادة المتقدمة */}
        <TabsContent value="restore" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Undo className="h-5 w-5" />
                الاستعادة المتقدمة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8">
                <Undo className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">استعادة البيانات</h3>
                <p className="text-muted-foreground mb-6">
                  استعد البيانات من النسخ الاحتياطية أو قم بعمليات استعادة متقدمة
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                  <Button variant="outline" data-testid="button-restore-from-backup">
                    <Upload className="h-4 w-4 ml-2" />
                    استعادة من نسخة احتياطية
                  </Button>
                  <Button variant="outline" data-testid="button-selective-restore">
                    <Copy className="h-4 w-4 ml-2" />
                    استعادة انتقائية
                  </Button>
                </div>
              </div>
              <Separator />
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>تحذير:</strong> عمليات الاستعادة قد تستغرق وقتاً طويلاً وقد تؤثر على أداء النظام.
                  تأكد من إنشاء نسخة احتياطية حديثة قبل البدء.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب إدارة قواعد البيانات */}
        <TabsContent value="database-mgmt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                إدارة قواعد البيانات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-6 border rounded-lg">
                  <Database className="h-12 w-12 mx-auto mb-3 text-blue-500" />
                  <h4 className="font-medium mb-2">قاعدة البيانات المصدر</h4>
                  <p className="text-sm text-muted-foreground mb-4">Supabase Database</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      {stats.isConnected ? (
                        <>
                          <Wifi className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">متصل</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-600">غير متصل</span>
                        </>
                      )}
                    </div>
                    <Button size="sm" variant="outline" data-testid="button-test-source-connection">
                      اختبار الاتصال
                    </Button>
                  </div>
                </div>

                <div className="text-center p-6 border rounded-lg">
                  <HardDrive className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <h4 className="font-medium mb-2">قاعدة البيانات المحلية</h4>
                  <p className="text-sm text-muted-foreground mb-4">Local PostgreSQL</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Wifi className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">متصل</span>
                    </div>
                    <Button size="sm" variant="outline" data-testid="button-manage-local-db">
                      إدارة قاعدة البيانات
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">أدوات الإدارة</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Button variant="outline" className="justify-start" data-testid="button-optimize-tables">
                    <Settings className="h-4 w-4 ml-2" />
                    تحسين الجداول
                  </Button>
                  <Button variant="outline" className="justify-start" data-testid="button-analyze-performance">
                    <BarChart3 className="h-4 w-4 ml-2" />
                    تحليل الأداء
                  </Button>
                  <Button variant="outline" className="justify-start" data-testid="button-manage-indexes">
                    <Database className="h-4 w-4 ml-2" />
                    إدارة الفهارس
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// مكون عرض تقدم الهجرة
interface MigrationProgressDisplayProps {
  migrationStatus?: MigrationStatus;
  onRefresh: () => void;
}

function MigrationProgressDisplay({ migrationStatus, onRefresh }: MigrationProgressDisplayProps) {
  if (!migrationStatus) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>جاري تحميل معلومات التقدم...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* نظرة عامة على التقدم */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>تقدم الهجرة</span>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
              تحديث
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>التقدم الإجمالي</span>
              <span>{migrationStatus.progress}%</span>
            </div>
            <Progress value={migrationStatus.progress} className="w-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{migrationStatus.processedRows.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">صفوف معالجة</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{migrationStatus.completedTables.length}</p>
              <p className="text-sm text-muted-foreground">جداول مكتملة</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{migrationStatus.remainingTables.length}</p>
              <p className="text-sm text-muted-foreground">جداول متبقية</p>
            </div>
          </div>

          {/* معلومات الوقت */}
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>بدأت في: {new Date(migrationStatus.startedAt).toLocaleString('ar-SA')}</span>
            <span>المتوقع الانتهاء: {new Date(migrationStatus.estimatedCompletion).toLocaleString('ar-SA')}</span>
          </div>
        </CardContent>
      </Card>

      {/* الجدول الحالي */}
      {migrationStatus.currentTable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 animate-pulse text-blue-500" />
              يتم معالجة: {migrationStatus.currentTable}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>تقدم الجدول الحالي</span>
                <span>{Math.round((migrationStatus.processedRows / migrationStatus.totalRows) * 100)}%</span>
              </div>
              <Progress 
                value={(migrationStatus.processedRows / migrationStatus.totalRows) * 100} 
                className="w-full" 
              />
              <p className="text-sm text-muted-foreground">
                {migrationStatus.processedRows.toLocaleString()} / {migrationStatus.totalRows.toLocaleString()} صف
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* الأخطاء */}
      {migrationStatus.errors && migrationStatus.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              الأخطاء ({migrationStatus.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              {migrationStatus.errors.map((error: any, index: number) => (
                <div key={index} className="mb-2 p-2 bg-red-50 rounded text-sm">
                  {error.message || error.toString()}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}