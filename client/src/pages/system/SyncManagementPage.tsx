
import { useState, useEffect, useMemo } from "react";
import { useSyncData } from "@/hooks/useSyncData";
import { getPendingSyncQueue, cancelSyncQueueItem } from "@/offline/offline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, RefreshCw, AlertCircle, Clock, Database, Activity, Search, Filter, Calendar, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedSearchFilter, useUnifiedFilter } from "@/components/ui/unified-search-filter";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function SyncManagementPage() {
  const { isSyncing, isOnline, manualSync, offlineCount } = useSyncData();
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const { toast } = useToast();
  const { setFloatingAction, setRefreshAction } = useFloatingButton();

  // تحميل العمليات المعلقة
  const loadPendingItems = async () => {
    const items = await getPendingSyncQueue();
    setPendingItems(items);
  };

  // تعيين الأزرار العائمة
  useEffect(() => {
    if (pendingItems.length > 0 && isOnline && !isSyncing) {
      setFloatingAction(manualSync, `مزامنة الكل (${pendingItems.length})`);
    } else {
      setFloatingAction(null);
    }
    
    setRefreshAction(() => loadPendingItems);

    return () => {
      setFloatingAction(null);
      setRefreshAction(null);
    };
  }, [pendingItems.length, isOnline, isSyncing, manualSync, setFloatingAction, setRefreshAction]);

  const {
    searchValue,
    filterValues,
    onSearchChange,
    onFilterChange,
    onReset
  } = useUnifiedFilter({ action: 'all', category: 'all', projectId: 'all' }, '');

  useEffect(() => {
    loadPendingItems();
    const interval = setInterval(loadPendingItems, 5000);
    return () => clearInterval(interval);
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await apiRequest("/api/projects", "GET");
      return res?.data || res || [];
    }
  });

  const filteredItems = useMemo(() => {
    return pendingItems.filter(item => {
      const matchesSearch = !searchValue || 
        item.endpoint.toLowerCase().includes(searchValue.toLowerCase()) ||
        item.id.toLowerCase().includes(searchValue.toLowerCase());
      
      const matchesAction = filterValues.action === 'all' || item.action === filterValues.action;
      
      // محاولة استخراج نوع العملية أو المشروع من البيانات إذا توفرت
      const body = typeof item.body === 'string' ? JSON.parse(item.body) : item.body;
      const matchesProject = filterValues.projectId === 'all' || body?.projectId === filterValues.projectId;

      return matchesSearch && matchesAction && matchesProject;
    });
  }, [pendingItems, searchValue, filterValues]);

  const handleCancel = async (id: string) => {
    await cancelSyncQueueItem(id);
    toast({
      title: "تم الإلغاء",
      description: "تمت إزالة العملية من قائمة الانتظار بنجاح",
    });
    loadPendingItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <RefreshCw className={isSyncing ? "animate-spin text-blue-500" : "text-blue-500"} />
            إدارة المزامنة
          </h1>
          <p className="text-muted-foreground text-sm">مراقبة وإدارة العمليات في وضع عدم الاتصال - AXION SYSTEM</p>
        </div>
      </div>

      <UnifiedStats
        stats={[
          {
            title: "العمليات المعلقة",
            value: pendingItems.length,
            icon: Clock,
            color: pendingItems.length > 0 ? "orange" : "blue",
            status: pendingItems.length > 10 ? "warning" : "normal"
          },
          {
            title: "حالة الاتصال",
            value: isOnline ? "متصل" : "أوفلاين",
            icon: Activity,
            color: isOnline ? "green" : "red",
            status: isOnline ? "normal" : "critical"
          },
          {
            title: "إجمالي المزامنة",
            value: offlineCount || 0,
            icon: Database,
            color: "purple"
          }
        ]}
      />

      <Card className="border-none shadow-sm bg-slate-50/50 dark:bg-slate-900/50">
        <CardContent className="p-4">
          <UnifiedSearchFilter
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            placeholder="بحث في العمليات أو العناوين..."
            filters={[
              {
                key: 'action',
                label: 'نوع العملية',
                options: [
                  { label: 'الكل', value: 'all' },
                  { label: 'إضافة', value: 'create' },
                  { label: 'تعديل', value: 'update' },
                  { label: 'حذف', value: 'delete' },
                ]
              },
              {
                key: 'projectId',
                label: 'المشروع',
                options: [
                  { label: 'جميع المشاريع', value: 'all' },
                  ...projects.map((p: any) => ({ label: p.name, value: p.id }))
                ]
              }
            ]}
            filterValues={filterValues}
            onFilterChange={onFilterChange}
            onReset={onReset}
          />
        </CardContent>
      </Card>

      <UnifiedCard
        title="العمليات في الانتظار"
        subtitle={filteredItems.length > 0 ? `تم العثور على ${filteredItems.length} عملية` : "لا توجد عمليات تطابق البحث"}
        icon={RefreshCw}
      >
        <ScrollArea className="h-[500px] pr-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-2">
              <Search className="h-10 w-10 opacity-20" />
              <p>لا توجد عمليات معلقة حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div 
                  key={item.id} 
                  className="group relative flex items-center justify-between p-4 rounded-xl border bg-card hover:border-blue-200 dark:hover:border-blue-800 transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 p-2 rounded-lg ${
                      item.action === 'create' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 
                      item.action === 'update' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 
                      'bg-red-100 text-red-600 dark:bg-red-900/30'
                    }`}>
                      <Activity size={18} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          item.action === 'create' ? 'success' : 
                          item.action === 'update' ? 'default' : 
                          'destructive'
                        } className="font-medium">
                          {item.action === 'create' ? 'إضافة' : item.action === 'update' ? 'تعديل' : 'حذف'}
                        </Badge>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
                          ID: {item.id.substring(0, 8)}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Database size={14} className="text-muted-foreground" />
                        {item.endpoint}
                      </h4>
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(item.timestamp).toLocaleDateString('ar-YE')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(item.timestamp).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {JSON.parse(item.body || '{}').projectId && (
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                            <Building2 size={12} />
                            مشروع: {projects.find((p: any) => p.id === JSON.parse(item.body).projectId)?.name || 'غير محدد'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleCancel(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </UnifiedCard>
    </div>
  );
}

