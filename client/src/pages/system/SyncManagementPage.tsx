
import { useState, useEffect } from "react";
import { useSyncData } from "@/hooks/useSyncData";
import { getPendingSyncQueue, cancelSyncQueueItem } from "@/offline/offline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, RefreshCw, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SyncManagementPage() {
  const { isSyncing, isOnline, manualSync, offlineCount } = useSyncData();
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const { toast } = useToast();

  const loadPendingItems = async () => {
    const items = await getPendingSyncQueue();
    setPendingItems(items);
  };

  useEffect(() => {
    loadPendingItems();
    const interval = setInterval(loadPendingItems, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (id: string) => {
    await cancelSyncQueueItem(id);
    toast({
      title: "تم الإلغاء",
      description: "تمت إزالة العملية من قائمة الانتظار بنجاح",
    });
    loadPendingItems();
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RefreshCw className={isSyncing ? "animate-spin" : ""} />
          إدارة المزامنة
        </h1>
        <div className="flex gap-2">
          <Button 
            onClick={manualSync} 
            disabled={!isOnline || isSyncing || pendingItems.length === 0}
            className="flex gap-2"
          >
            <RefreshCw size={16} />
            مزامنة الكل
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock size={16} />
              العمليات المعلقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingItems.length}</div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle size={16} />
              حالة الاتصال
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "متصل بالإنترنت" : "بدون اتصال"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 overflow-hidden">
        <CardHeader>
          <CardTitle>قائمة العمليات في الانتظار</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh]">
            {pendingItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                لا توجد عمليات معلقة حالياً
              </div>
            ) : (
              <div className="divide-y">
                {pendingItems.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {item.action === 'create' ? 'إضافة' : item.action === 'update' ? 'تعديل' : 'حذف'}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">{item.id.substring(0, 8)}</span>
                      </div>
                      <div className="text-sm font-medium">
                        {item.endpoint}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString('ar-YE')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleCancel(item.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
