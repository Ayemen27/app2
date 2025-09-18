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
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// أنواع البيانات للهجرة
interface MigrationTable {
  name: string;
  displayName: string;
  category: string;
  estimatedRows: number;
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

  // حساب الإحصائيات
  const stats = {
    totalTables: tablesData?.length || 0,
    selectedTables: selectedTables.length,
    readyTables: (tablesData || []).filter((t: MigrationTable) => t.status === 'ready').length,
    completedTables: (tablesData || []).filter((t: MigrationTable) => t.status === 'completed').length
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl" dir="rtl">
      {/* العنوان والإحصائيات */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">هجرة البيانات من Supabase</h1>
            <p className="text-muted-foreground">نقل البيانات بأمان وكفاءة إلى قاعدة البيانات المحلية</p>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الجداول</p>
                  <p className="text-2xl font-bold">{stats.totalTables}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">جداول مكتملة</p>
                  <p className="text-2xl font-bold">{stats.completedTables}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">جداول محددة</p>
                  <p className="text-2xl font-bold">{stats.selectedTables}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">جداول جاهزة</p>
                  <p className="text-2xl font-bold">{stats.readyTables}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* علامات التبويب */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tables" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            اختيار الجداول
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            الإعدادات
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            متابعة التقدم
          </TabsTrigger>
        </TabsList>

        {/* تبويب اختيار الجداول */}
        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>الجداول المتاحة للهجرة</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchTables()}
                  disabled={tablesLoading}
                  data-testid="button-refresh-tables"
                >
                  <RefreshCw className={`h-4 w-4 ${tablesLoading ? 'animate-spin' : ''}`} />
                  تحديث
                </Button>
              </CardTitle>
              
              {/* أدوات البحث والتصفية */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث في الجداول..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-tables"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full p-2 border rounded-md"
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    data-testid="button-toggle-select-all"
                  >
                    {selectedTables.length === filteredTables.length ? 'إلغاء اختيار الكل' : 'اختيار الكل'}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    محدد {selectedTables.length} من {filteredTables.length} جدول
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">اختيار</TableHead>
                      <TableHead>اسم الجدول</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead>الصفوف المقدرة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الأولوية</TableHead>
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
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{table.category}</Badge>
                          </TableCell>
                          <TableCell>{table.estimatedRows.toLocaleString()}</TableCell>
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
                          <TableCell>
                            <Badge variant="outline">{table.priority}</Badge>
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
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
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