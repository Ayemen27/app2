import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { Loader2, Database, Download, RotateCcw, ShieldCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

  const { data: logsResponse, isLoading } = useQuery<BackupLogsResponse>({
    queryKey: ["/api/backups/logs"],
  });

  const logs = logsResponse?.data || [];

  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/backups/run");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backups/logs"] });
      toast({ title: "تم إنشاء النسخة الاحتياطية بنجاح" });
    },
    onError: (error: any) => {
      toast({ 
        title: "فشل إنشاء النسخة الاحتياطية", 
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
      toast({ title: "تمت الاستعادة بنجاح", description: "النظام سيقوم بالتحديث الآن" });
      setTimeout(() => window.location.reload(), 2000);
    },
    onSettled: () => setIsRestoring(null)
  });

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Database className="h-8 w-8 text-primary" />
          إدارة النسخ الاحتياطي
        </h1>
        <Button 
          onClick={() => backupMutation.mutate()} 
          disabled={backupMutation.isPending}
          className="gap-2"
        >
          {backupMutation.isPending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
          إنشاء نسخة يدوية الآن
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">حالة النظام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">نشط</div>
            <p className="text-xs text-muted-foreground">النسخ التلقائي: كل 24 ساعة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">آخر نسخة ناجحة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {logs?.[0]?.createdAt ? new Date(logs[0].createdAt).toLocaleDateString('ar-SA') : "لا يوجد"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">عدد النسخ المحفوظة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل العمليات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">اسم الملف</TableHead>
                  <TableHead className="text-right">الحجم</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log: BackupLog) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.createdAt).toLocaleString('ar-SA')}</TableCell>
                    <TableCell className="font-mono text-xs">{log.filename}</TableCell>
                    <TableCell>{log.size} MB</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status === 'success' ? 'ناجحة' : 'فاشلة'}
                      </span>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Download className="h-4 w-4" /> تحميل
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="gap-1"
                        disabled={isRestoring !== null}
                        onClick={() => {
                          if (confirm("تحذير: استعادة البيانات ستمسح الحالة الحالية. هل أنت متأكد؟")) {
                            setIsRestoring(log.id);
                            restoreMutation.mutate(log.id);
                          }
                        }}
                      >
                        {isRestoring === log.id ? <Loader2 className="animate-spin h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                        استعادة
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
