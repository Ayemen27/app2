
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { CreateNotificationDialog } from '@/components/notifications/CreateNotificationDialog';
import { 
  Bell, Users, Zap, BarChart3, AlertCircle, CheckCircle2,
  RefreshCw, MoreVertical, Download, Upload, Settings,
  AlertTriangle, MessageSquare, ShieldCheck, Mail, Smartphone,
  TrendingUp, Trash2, Plus, Clock, Eye, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { UnifiedCard, UnifiedCardGrid } from '@/components/ui/unified-card';
import { UnifiedStats } from '@/components/ui/unified-stats';
import UnifiedFilterDashboard from '@/components/ui/unified-filter-dashboard';
import { useUnifiedFilter } from '@/components/ui/unified-search-filter';
import { useFloatingButton } from '@/components/layout/floating-button-context';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { QUERY_KEYS } from "@/constants/queryKeys";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const { isAuthenticated, getAccessToken, isLoading: isAuthLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewingNotification, setViewingNotification] = useState<any>(null);
  const { setFloatingAction, setRefreshAction, setShowAddButton } = useFloatingButton();

  // تعيين الأزرار العائمة
  useEffect(() => {
    const handleAdd = () => {
      console.log("Floating button clicked - Opening dialog");
      setIsCreateDialogOpen(true);
    };
    
    // إزالة زر التحديث وتعديل زر الإضافة
    setFloatingAction(() => handleAdd, "إرسال إشعار جديد");
    if (setShowAddButton) setShowAddButton(true);
    
    return () => {
      setFloatingAction(null);
      setRefreshAction(null);
      if (setShowAddButton) setShowAddButton(false);
    };
  }, [setFloatingAction, setRefreshAction, setShowAddButton]);

  const filterConfigs = [
    {
      key: 'type',
      label: 'النوع',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'الكل' },
        { value: 'safety', label: 'تنبيه أمني' },
        { value: 'task', label: 'إشعار مهمة' },
        { value: 'payroll', label: 'إشعار راتب' },
        { value: 'announcement', label: 'إعلان عام' },
        { value: 'system', label: 'إشعار نظام' },
      ]
    },
    {
      key: 'priority',
      label: 'الأولوية',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'الكل' },
        { value: '1', label: 'حرج جداً' },
        { value: '2', label: 'عاجل' },
        { value: '3', label: 'متوسط' },
        { value: '4', label: 'منخفض' },
        { value: '5', label: 'معلومة' },
      ]
    }
  ];

  const { searchValue, filterValues, onSearchChange, onFilterChange, onReset } = useUnifiedFilter(
    { type: 'all', priority: 'all' },
    ''
  );

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': getAccessToken() ? `Bearer ${getAccessToken()}` : '',
  });

  const { data: notificationsData, isLoading: isLoadingNotifications, refetch } = useQuery({
    queryKey: QUERY_KEYS.adminNotifications(filterValues, searchValue),
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '50',
        ...(filterValues.type !== 'all' && { type: filterValues.type }),
        ...(filterValues.priority !== 'all' && { priority: filterValues.priority }),
        ...(searchValue && { search: searchValue })
      });
      const response = await fetch(`/api/admin/notifications?${params}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل في جلب البيانات');
      return response.json();
    },
    enabled: isAuthenticated && !isAuthLoading
  });

  // تحديث إجراء التحديث العائم عند تغير دالة refetch
  useEffect(() => {
    if (refetch) {
      setRefreshAction(() => {
        return () => {
          refetch();
          toast({ title: 'تم تحديث البيانات' });
        };
      });
    }
  }, [refetch, setRefreshAction, toast]);

  const { data: activityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: [QUERY_KEYS.adminNotifications, 'activity'],
    queryFn: async () => {
      const response = await fetch('/api/admin/notifications/stats', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل في جلب النشاط');
      return response.json();
    },
    enabled: isAuthenticated && !isAuthLoading
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل الحذف');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم حذف الإشعار بنجاح' });
      refetch();
    }
  });

  const notifications = notificationsData?.notifications || [];
  const stats = useMemo(() => {
    const total = activityData?.total || 0;
    const unread = activityData?.unread || 0;
    const critical = activityData?.critical || 0;
    const readRate = total > 0 ? Math.round(((total - unread) / total) * 100) : 0;
    
    return [
      {
        title: "إجمالي الإشعارات",
        value: total,
        icon: Bell,
        color: "blue" as const
      },
      {
        title: "إشعارات حرجة",
        value: critical,
        icon: AlertCircle,
        color: "red" as const,
        status: critical > 0 ? "critical" as const : "normal" as const
      },
      {
        title: "معدل القراءة",
        value: `${readRate}%`,
        icon: CheckCircle2,
        color: "green" as const,
        trend: { value: 5, isPositive: true }
      },
      {
        title: "نشاط المستخدمين",
        value: activityData?.userStats?.length || 0,
        icon: Users,
        color: "purple" as const
      },
      {
        title: "غير مقروء",
        value: unread,
        icon: Eye,
        color: "orange" as const,
        status: unread > 0 ? "warning" as const : "normal" as const
      },
      {
        title: "تنبيهات أمنية",
        value: activityData?.typeStats?.safety || 0,
        icon: ShieldCheck,
        color: "amber" as const
      }
    ];
  }, [activityData]);

  const priorityMap: Record<string, { label: string, color: any }> = {
    '1': { label: 'حرج', color: 'destructive' },
    'critical': { label: 'حرج', color: 'destructive' },
    '2': { label: 'عاجل', color: 'warning' },
    'high': { label: 'عاجل', color: 'warning' },
    '3': { label: 'متوسط', color: 'default' },
    'medium': { label: 'متوسط', color: 'default' },
    '4': { label: 'منخفض', color: 'secondary' },
    'low': { label: 'منخفض', color: 'secondary' },
    '5': { label: 'معلومة', color: 'outline' },
    'info': { label: 'معلومة', color: 'outline' },
  };

  const typeIcons: Record<string, any> = {
    safety: ShieldCheck,
    task: CheckCircle2,
    payroll: Zap,
    announcement: MessageSquare,
    system: Settings,
  };

  return (
    <div className="min-h-screen bg-background pb-10" dir="rtl">
      <main className="container px-4 py-6 sm:px-8 space-y-6">
        <CreateNotificationDialog 
          open={isCreateDialogOpen} 
          onOpenChange={setIsCreateDialogOpen} 
          onUpdate={() => refetch()} 
          showTrigger={false}
        />
        
        <UnifiedStats 
          stats={stats} 
          columns={3} 
          className="mb-6"
        />

        <UnifiedFilterDashboard
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          filters={filterConfigs}
          filterValues={filterValues}
          onFilterChange={onFilterChange}
          onReset={onReset}
          compact={false}
          className="w-full"
        />

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:flex gap-2">
              <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" /> النظرة العامة</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> السجل</TabsTrigger>
              <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> المستخدمين</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0">
            <UnifiedCardGrid columns={2}>
              <UnifiedCard
                title="أكثر المستخدمين تفاعلاً"
                titleIcon={TrendingUp}
                fields={activityData?.userStats?.slice(0, 5).map((u: any, i: number) => ({
                  label: `${i + 1}. ${u.userName}`,
                  value: `${u.readNotifications} / ${u.totalNotifications}`,
                  emphasis: i === 0,
                  color: i === 0 ? "success" : "default"
                })) || []}
                footer={<Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setSelectedTab('users')}>عرض التفاصيل الكاملة</Button>}
              />
              <UnifiedCard
                title="توزيع القنوات"
                titleIcon={Zap}
                fields={[
                  { label: "إشعارات التطبيق", value: notifications.length, icon: Smartphone, color: "info" },
                  { label: "البريد الإلكتروني", value: "مفعل", icon: Mail, color: "success" },
                  { label: "الرسائل النصية", value: "متوقف", icon: MessageSquare, color: "muted" },
                  { label: "تنبيهات فورية", value: "نشط", icon: Zap, color: "warning" }
                ]}
              />
            </UnifiedCardGrid>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <UnifiedCardGrid columns={1} className="max-w-4xl mx-auto space-y-4">
              {isLoadingNotifications ? (
                Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />)
              ) : notifications.length > 0 ? (
                notifications.map((notif: any) => {
                  const config = priorityMap[notif.priority] || priorityMap['3'];
                  const Icon = typeIcons[notif.type] || Bell;
                  
                  return (
                    <div 
                      key={notif.id}
                      onClick={() => setViewingNotification(notif)}
                      className={cn(
                        "group relative flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer",
                        "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0",
                        notif.type === 'safety' ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-50 dark:bg-slate-800"
                      )}>
                        <Icon className={cn("h-6 w-6", notif.type === 'safety' ? "text-red-600" : "text-primary")} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                            {notif.title}
                          </h3>
                          <Badge variant={config.color} className="text-[10px] font-bold px-2 py-0">
                            {config.label}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {notif.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(notif.createdAt), 'PPp', { locale: ar })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{notif.recipientType === 'all' ? 'الجميع' : 'مستهدف'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 self-center">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            if(confirm('هل أنت متأكد من حذف هذا الإشعار؟')) deleteMutation.mutate(notif.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50">
                  <Bell className="mx-auto h-16 w-16 text-muted-foreground/20 animate-pulse" />
                  <h3 className="mt-4 text-xl font-bold">لا توجد إشعارات</h3>
                  <p className="text-muted-foreground mt-2">لم يتم العثور على إشعارات تطابق معايير البحث.</p>
                </div>
              )}
            </UnifiedCardGrid>
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <UnifiedCardGrid columns={3}>
              {activityData?.userStats?.map((user: any) => (
                <UnifiedCard
                  key={user.userId}
                  title={user.userName}
                  subtitle={user.userEmail}
                  titleIcon={Users}
                  fields={[
                    { label: "إشعارات مستلمة", value: user.totalNotifications, color: "info" },
                    { label: "إشعارات مقروءة", value: user.readNotifications, color: "success" },
                    { label: "آخر نشاط", value: user.lastReadAt ? format(new Date(user.lastReadAt), 'PP', { locale: ar }) : 'أبداً', color: "muted" }
                  ]}
                  compact={true}
                />
              ))}
            </UnifiedCardGrid>
          </TabsContent>
        </Tabs>

        {/* حوار عرض تفاصيل الإشعار */}
        <Dialog open={!!viewingNotification} onOpenChange={(open) => !open && setViewingNotification(null)}>
          <DialogContent className="sm:max-w-lg rounded-[2rem] overflow-hidden border-none shadow-2xl p-0 gap-0">
            {viewingNotification && (
              <>
                <div className={cn(
                  "h-32 w-full flex items-center justify-center relative overflow-hidden",
                  viewingNotification.type === 'safety' ? "bg-red-600" : "bg-primary"
                )}>
                  <div className="absolute inset-0 opacity-20">
                    <Zap className="absolute -top-4 -left-4 h-32 w-32 rotate-12" />
                    <Bell className="absolute -bottom-4 -right-4 h-32 w-32 -rotate-12" />
                  </div>
                  <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center ring-4 ring-white/10 relative z-10 shadow-inner">
                    {(() => {
                      const Icon = typeIcons[viewingNotification.type] || Bell;
                      return <Icon className="h-10 w-10 text-white" />;
                    })()}
                  </div>
                </div>

                <div className="p-8 pt-6 space-y-6">
                  <div className="space-y-2 text-center">
                    <Badge variant={priorityMap[viewingNotification.priority]?.color} className="mb-2">
                      {priorityMap[viewingNotification.priority]?.label}
                    </Badge>
                    <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white">
                      {viewingNotification.title}
                    </DialogTitle>
                    <DialogDescription className="flex items-center justify-center gap-2 font-medium">
                      <Clock className="h-4 w-4 text-primary" />
                      {format(new Date(viewingNotification.createdAt), 'PPPP p', { locale: ar })}
                    </DialogDescription>
                  </div>

                  <div className="p-6 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 shadow-inner">
                    <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">
                      {viewingNotification.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">المستهدف</span>
                      <span className="text-sm font-black">{viewingNotification.recipientType === 'all' ? 'الجميع' : 'مستهدف'}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">النوع</span>
                      <span className="text-sm font-black">{viewingNotification.type}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full h-14 rounded-2xl font-black text-lg shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
                    onClick={() => setViewingNotification(null)}
                  >
                    إغلاق التفاصيل
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
