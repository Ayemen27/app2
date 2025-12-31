import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { getDB } from '@/offline/db';

interface TableComparison {
  tableName: string;
  serverCount: number;
  localCount: number;
  difference: number;
  isSynced: boolean;
}

export default function SyncComparisonPage() {
  const { toast } = useToast();
  const [comparisons, setComparisons] = useState<TableComparison[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalServerRecords, setTotalServerRecords] = useState(0);
  const [totalLocalRecords, setTotalLocalRecords] = useState(0);

  const loadComparison = async () => {
    setIsLoading(true);
    try {
      // جلب بيانات الخادم
      const serverResponse = await apiRequest('/api/sync/compare', 'GET');
      const serverData = serverResponse.data.serverData;

      // جلب بيانات IndexedDB
      const db = await getDB();
      const localData: Record<string, number> = {};

      for (const tableName of Object.keys(serverData)) {
        try {
          const records = await db.getAll(tableName);
          localData[tableName] = records.length;
        } catch (err) {
          localData[tableName] = 0;
        }
      }

      // المقارنة
      const results: TableComparison[] = [];
      let totalServer = 0;
      let totalLocal = 0;

      for (const [tableName, serverCount] of Object.entries(serverData)) {
        const localCount = localData[tableName] || 0;
        totalServer += serverCount as number;
        totalLocal += localCount;

        results.push({
          tableName,
          serverCount: serverCount as number,
          localCount,
          difference: Math.abs((serverCount as number) - localCount),
          isSynced: (serverCount as number) === localCount,
        });
      }

      results.sort((a, b) => {
        // الجداول غير المتزامنة أولاً
        if (a.isSynced !== b.isSynced) return a.isSynced ? 1 : -1;
        // ثم حسب الفرق
        return b.difference - a.difference;
      });

      setComparisons(results);
      setTotalServerRecords(totalServer);
      setTotalLocalRecords(totalLocal);

      toast({
        title: 'تم المقارنة بنجاح',
        description: `الخادم: ${totalServer} سجل | المحلي: ${totalLocal} سجل`,
      });
    } catch (error: any) {
      toast({
        title: 'خطأ في المقارنة',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, []);

  const unsyncedCount = comparisons.filter(c => !c.isSynced).length;
  const totalDifference = comparisons.reduce((sum, c) => sum + c.difference, 0);

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="sync-comparison-page">
      {/* الملخص */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              سجلات الخادم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalServerRecords}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              السجلات المحلية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalLocalRecords}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              الجداول غير المتزامنة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${
                unsyncedCount === 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {unsyncedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الإجراءات */}
      <div className="flex gap-2">
        <Button
          onClick={loadComparison}
          disabled={isLoading}
          data-testid="button-refresh-comparison"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {isLoading ? 'جاري التحديث...' : 'تحديث المقارنة'}
        </Button>
      </div>

      {/* الجداول */}
      <Card>
        <CardHeader>
          <CardTitle>مقارنة الجداول</CardTitle>
          <CardDescription>
            قارن عدد السجلات بين قاعدة البيانات المحلية والخادم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="sync-comparison-table">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">اسم الجدول</th>
                  <th className="text-center py-3 px-4 font-medium">الخادم</th>
                  <th className="text-center py-3 px-4 font-medium">المحلي</th>
                  <th className="text-center py-3 px-4 font-medium">الفرق</th>
                  <th className="text-center py-3 px-4 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((comp, idx) => (
                  <tr
                    key={comp.tableName}
                    className={`border-b hover:bg-slate-50 dark:hover:bg-slate-900 ${
                      comp.isSynced ? '' : 'bg-red-50 dark:bg-red-900/20'
                    }`}
                    data-testid={`table-row-${comp.tableName}`}
                  >
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {comp.tableName}
                    </td>
                    <td className="text-center py-3 px-4 text-slate-600 dark:text-slate-400">
                      {comp.serverCount}
                    </td>
                    <td className="text-center py-3 px-4 text-slate-600 dark:text-slate-400">
                      {comp.localCount}
                    </td>
                    <td
                      className={`text-center py-3 px-4 font-medium ${
                        comp.difference === 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {comp.difference}
                    </td>
                    <td className="text-center py-3 px-4">
                      {comp.isSynced ? (
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>متزامن</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span>غير متزامن</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ملخص النتائج */}
      {totalDifference > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-600">تنبيه: وجود اختلافات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>عدد السجلات المختلفة: <span className="font-bold">{totalDifference}</span></p>
            <p>الجداول المتأثرة: <span className="font-bold">{unsyncedCount}</span></p>
            <p className="text-slate-600 dark:text-slate-400">
              يرجى التحقق من اتصال الإنترنت والمزامنة وإعادة تشغيل التطبيق إذا استمرت المشكلة.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
