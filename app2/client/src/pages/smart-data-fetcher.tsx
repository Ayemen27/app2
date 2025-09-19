import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Download, Database, RefreshCw, Eye, Settings, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// API Response Types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface TableInfo {
  columns: string[];
  rowCount: number;
}

interface SyncResult {
  success: boolean;
  synced: number;
  errors: number;
  savedLocally: number;
}

interface TableDataResponse {
  data: Record<string, any>[];
  count: number;
}

interface FullBackupSummary {
  tablesProcessed: number;
  totalSynced: number;
  totalSaved: number;
  totalErrors: number;
}

interface FullBackupResult {
  tableName: string;
  success: boolean;
  synced: number;
  savedLocally: number;
  errors?: number;
}

interface FullBackupResponse {
  summary: FullBackupSummary;
  results: FullBackupResult[];
}

// Type Guards
const isTableDataResponse = (data: unknown): data is TableDataResponse => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'count' in data &&
    Array.isArray((data as any).data) &&
    typeof (data as any).count === 'number'
  );
};

const isTableInfo = (data: unknown): data is TableInfo => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'columns' in data &&
    'rowCount' in data &&
    Array.isArray((data as any).columns) &&
    typeof (data as any).rowCount === 'number'
  );
};

export default function SupabaseBackupSystem() {
  const [selectedTable, setSelectedTable] = useState("");
  const [previewLimit, setPreviewLimit] = useState(50);
  const [previewOffset, setPreviewOffset] = useState(0);
  const [batchSize, setBatchSize] = useState(100);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // جلب قائمة الجداول المتاحة للنسخ الاحتياطي
  const { data: tablesData, isLoading: tablesLoading } = useQuery<ApiResponse<string[]>>({
    queryKey: ["/api/backup/tables"]
  });

  // جلب معلومات الجدول من Supabase
  const { data: tableInfo, isLoading: infoLoading } = useQuery<ApiResponse<TableInfo>>({
    queryKey: ["/api/backup/table", selectedTable, "info"],
    enabled: !!selectedTable
  });

  // معاينة بيانات الجدول من Supabase  
  const { data: tableData, isLoading: dataLoading, refetch: refetchData } = useQuery<ApiResponse<TableDataResponse>>({
    queryKey: ["/api/backup/table", selectedTable, "preview", `?limit=${previewLimit}&offset=${previewOffset}`],
    enabled: !!selectedTable
  });

  // نسخ احتياطي للجدول من Supabase
  const backupMutation = useMutation<ApiResponse<SyncResult>, Error, { tableName: string; batchSize: number }>({
    mutationFn: async ({ tableName, batchSize }: { tableName: string; batchSize: number }) => {
      return await apiRequest(`/api/backup/table/${tableName}/backup`, "POST", { batchSize });
    },
    onSuccess: (data) => {
      if (data?.data) {
        toast({
          title: "تم النسخ الاحتياطي بنجاح",
          description: `تم نسخ ${data.data.synced} صف من Supabase وحفظ ${data.data.savedLocally} صف محلياً`
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/backup/table"] });
    },
    onError: (error) => {
      toast({
        title: "خطأ في النسخ الاحتياطي",
        description: error.message || "حدث خطأ أثناء النسخ الاحتياطي",
        variant: "destructive"
      });
    }
  });

  // نسخة احتياطية شاملة لجميع الجداول
  const fullBackupMutation = useMutation<ApiResponse<FullBackupResponse>, Error, { batchSize: number }>({
    mutationFn: async ({ batchSize }: { batchSize: number }) => {
      return await apiRequest(`/api/backup/full-backup`, "POST", { batchSize });
    },
    onSuccess: (data) => {
      if (data?.data?.summary) {
        const summary = data.data.summary;
        toast({
          title: "تم النسخ الاحتياطي الشامل بنجاح",
          description: `تم نسخ ${summary.totalSynced} صف من ${summary.tablesProcessed} جدول وحفظ ${summary.totalSaved} صف محلياً`
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/backup"] });
    },
    onError: (error) => {
      toast({
        title: "خطأ في النسخ الاحتياطي الشامل",
        description: error.message || "حدث خطأ أثناء النسخ الاحتياطي الشامل",
        variant: "destructive"
      });
    }
  });

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setPreviewOffset(0); // إعادة تعيين الإزاحة عند تغيير الجدول
  };

  const handleBackup = () => {
    if (!selectedTable) return;
    backupMutation.mutate({ tableName: selectedTable, batchSize });
  };

  const handleFullBackup = () => {
    fullBackupMutation.mutate({ batchSize });
  };

  const handlePrevPage = () => {
    setPreviewOffset(Math.max(0, previewOffset - previewLimit));
  };

  const handleNextPage = () => {
    setPreviewOffset(previewOffset + previewLimit);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 bg-white dark:bg-black text-black dark:text-white" data-testid="page-smart-data-fetcher">
      {/* العنوان الرئيسي */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold">نظام النسخ الاحتياطي من Supabase</h1>
            <p className="text-gray-600 dark:text-gray-400">
              نسخ آمن وشامل لبيانات قاعدة البيانات من Supabase إلى قاعدة البيانات المحلية
            </p>
          </div>
        </div>
        
        {/* زر النسخ الاحتياطي الشامل */}
        <Button
          onClick={handleFullBackup}
          disabled={fullBackupMutation.isPending}
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white"
          data-testid="button-full-backup"
        >
          {fullBackupMutation.isPending ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
              نسخ شامل جاري...
            </>
          ) : (
            <>
              <Download className="h-5 w-5 mr-2" />
              نسخ احتياطي شامل
            </>
          )}
        </Button>
      </div>

      {/* إعدادات الجدول */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إعدادات الجدول
          </CardTitle>
          <CardDescription>
            اختر الجدول المراد العمل معه وحدد المعاملات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="table-select">الجدول</Label>
              <Select 
                value={selectedTable} 
                onValueChange={handleTableSelect}
                data-testid="select-table"
              >
                <SelectTrigger id="table-select">
                  <SelectValue placeholder="اختر جدول..." />
                </SelectTrigger>
                <SelectContent>
                  {tablesData?.data?.map((table: string) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preview-limit">عدد الصفوف للمعاينة</Label>
              <Input
                id="preview-limit"
                type="number"
                value={previewLimit}
                onChange={(e) => setPreviewLimit(parseInt(e.target.value) || 50)}
                min={10}
                max={100}
                data-testid="input-preview-limit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-size">حجم الدفعة (للنسخ الاحتياطي)</Label>
              <Input
                id="batch-size"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 100)}
                min={50}
                max={200}
                data-testid="input-batch-size"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedTable && (
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" data-testid="tab-info">
              معلومات الجدول
            </TabsTrigger>
            <TabsTrigger value="data" data-testid="tab-data">
              معاينة البيانات
            </TabsTrigger>
            <TabsTrigger value="backup" data-testid="tab-backup">
              النسخ الاحتياطي
            </TabsTrigger>
          </TabsList>

          {/* معلومات الجدول */}
          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  معلومات الجدول: {selectedTable} (Supabase)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {infoLoading ? (
                  <div className="text-center py-8">جاري تحميل معلومات الجدول...</div>
                ) : (tableInfo?.data && isTableInfo(tableInfo.data)) ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-lg">
                        عدد الصفوف: {tableInfo.data.rowCount.toLocaleString()}
                      </Badge>
                      <Badge variant="outline" className="text-lg">
                        عدد الأعمدة: {tableInfo.data.columns.length}
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">الأعمدة:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {tableInfo.data.columns.map((column: string) => (
                          <Badge key={column} variant="secondary">
                            {column}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد معلومات متاحة
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* البيانات */}
          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    معاينة البيانات: {selectedTable} (Supabase)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => refetchData()} 
                      variant="outline" 
                      size="sm"
                      data-testid="button-refresh-data"
                    >
                      تحديث
                    </Button>
                  </div>
                </CardTitle>
                {(tableData?.data && isTableDataResponse(tableData.data)) && (
                  <CardDescription>
                    عرض {tableData.data.count} صف من إجمالي {(tableInfo?.data && isTableInfo(tableInfo.data)) ? tableInfo.data.rowCount : 0}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="text-center py-8">جاري تحميل البيانات...</div>
                ) : (tableData?.data && isTableDataResponse(tableData.data) && tableData.data.data.length > 0) ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(tableData.data.data[0]).map((column) => (
                              <TableHead key={column}>{column}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableData.data.data.map((row: any, index: number) => (
                            <TableRow key={index}>
                              {Object.values(row).map((value: any, cellIndex: number) => (
                                <TableCell key={cellIndex}>
                                  {value !== null && value !== undefined ? String(value) : "-"}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* أزرار التنقل */}
                    <div className="flex items-center justify-between">
                      <Button 
                        onClick={handlePrevPage}
                        disabled={previewOffset === 0}
                        variant="outline"
                        data-testid="button-prev-page"
                      >
                        الصفحة السابقة
                      </Button>
                      
                      <span className="text-sm text-gray-600">
                        الصفوف {previewOffset + 1} - {previewOffset + ((tableData?.data && isTableDataResponse(tableData.data)) ? tableData.data.count : 0)}
                      </span>
                      
                      <Button 
                        onClick={handleNextPage}
                        disabled={!(tableData?.data && isTableDataResponse(tableData.data)) || tableData.data.count < previewLimit}
                        variant="outline"
                        data-testid="button-next-page"
                      >
                        الصفحة التالية
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد بيانات للعرض
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* النسخ الاحتياطي */}
          <TabsContent value="backup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  نسخ احتياطي للجدول: {selectedTable}
                </CardTitle>
                <CardDescription>
                  قم بعمل نسخة احتياطية من بيانات الجدول من Supabase وحفظها في قاعدة البيانات المحلية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleBackup}
                    disabled={backupMutation.isPending}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    data-testid="button-backup-table"
                  >
                    {backupMutation.isPending ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        جاري النسخ الاحتياطي...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        بدء النسخ الاحتياطي
                      </>
                    )}
                  </Button>
                  
                  {(tableInfo?.data && isTableInfo(tableInfo.data)) && (
                    <div className="text-sm text-gray-600">
                      سيتم نسخ {tableInfo.data.rowCount.toLocaleString()} صف من Supabase على دفعات من {batchSize} صف
                    </div>
                  )}
                </div>

                {/* عرض نتائج آخر نسخة احتياطية */}
                {(backupMutation.data?.data) && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                      <CheckCircle className="h-5 w-5" />
                      <div>
                        <div className="font-semibold">تم النسخ الاحتياطي بنجاح</div>
                        <div className="text-sm">
                          تم نسخ {backupMutation.data.data.synced} صف من Supabase
                          {backupMutation.data.data.savedLocally && (
                            <span className="text-blue-600 dark:text-blue-400">
                              {" "}
                              وحفظ {backupMutation.data.data.savedLocally} صف محلياً
                            </span>
                          )}
                          {backupMutation.data.data.errors > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                              {" "}
                              مع {backupMutation.data.data.errors} خطأ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {backupMutation.error && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                      <AlertCircle className="h-5 w-5" />
                      <div>
                        <div className="font-semibold">خطأ في النسخ الاحتياطي</div>
                        <div className="text-sm">{backupMutation.error?.message || "حدث خطأ غير معروف"}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* عرض نتائج النسخ الاحتياطي الشامل */}
            {(fullBackupMutation.data?.data) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="h-5 w-5" />
                    نتائج النسخ الاحتياطي الشامل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {fullBackupMutation.data.data.summary.tablesProcessed}
                      </div>
                      <div className="text-sm text-gray-600">جدول تم معالجته</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {fullBackupMutation.data.data.summary.totalSynced}
                      </div>
                      <div className="text-sm text-gray-600">صف تم نسخه</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {fullBackupMutation.data.data.summary.totalSaved}
                      </div>
                      <div className="text-sm text-gray-600">صف تم حفظه محلياً</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {fullBackupMutation.data.data.summary.totalErrors}
                      </div>
                      <div className="text-sm text-gray-600">أخطاء</div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {fullBackupMutation.data.data.results.map((result: FullBackupResult, index: number) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-2 rounded ${
                          result.success 
                            ? 'bg-green-50 dark:bg-green-900/20' 
                            : 'bg-red-50 dark:bg-red-900/20'
                        }`}
                      >
                        <span className="font-medium">{result.tableName}</span>
                        <div className="text-sm">
                          {result.success ? (
                            <span className="text-green-700 dark:text-green-300">
                              ✅ {result.synced} صف نُسخ، {result.savedLocally} صف حُفظ
                            </span>
                          ) : (
                            <span className="text-red-700 dark:text-red-300">
                              ❌ فشل
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {fullBackupMutation.error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <div className="font-semibold">خطأ في النسخ الاحتياطي الشامل</div>
                    <div className="text-sm">{fullBackupMutation.error?.message || "حدث خطأ غير معروف"}</div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!selectedTable && (
        <Card>
          <CardContent className="text-center py-12">
            <Database className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">اختر جدول للنسخ الاحتياطي</h3>
            <p className="text-gray-600 dark:text-gray-400">
              قم بتحديد جدول من القائمة أعلاه لعرض المعلومات وعمل نسخة احتياطية من بيانات Supabase
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}