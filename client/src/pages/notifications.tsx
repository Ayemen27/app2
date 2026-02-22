import { apiRequest } from '@/lib/queryClient';
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell, Clock, Trash2, CheckCheck, RefreshCw, Eye, 
  MoreVertical, CheckCircle, Shield, Wrench, Package, 
  Users, MessageSquare, AlertTriangle, AlertCircle, Zap,
  ChevronDown, ChevronRight, Info, AlertOctagon, Activity,
  X, Check
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { UnifiedFilterDashboard } from '@/components/ui/unified-filter-dashboard';
import { UnifiedStats } from '@/components/ui/unified-stats';
import type { FilterConfig } from '@/components/ui/unified-search-filter';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QUERY_KEYS } from "@/constants/queryKeys";

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  body?: string;
  priority: number | string;
  createdAt: string;
  status?: 'read' | 'unread';
  isRead?: boolean;
  actionRequired?: boolean;
  projectId?: string;
  payload?: any;
}

const notificationTypeConfig: Record<string, { 
  icon: any; 
  color: string; 
  bgColor: string; 
  borderColor: string;
  label: string;
}> = {
  system: { icon: Shield, color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800', borderColor: 'border-slate-200 dark:border-slate-700', label: 'نظام' },
  security: { icon: Shield, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20', borderColor: 'border-red-200 dark:border-red-800', label: 'أمان' },
  maintenance: { icon: Wrench, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-200 dark:border-orange-800', label: 'صيانة' },
  warranty: { icon: Package, color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20', borderColor: 'border-purple-200 dark:border-purple-800', label: 'ضمان' },
  damaged: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20', borderColor: 'border-red-200 dark:border-red-800', label: 'تلف' },
  'user-welcome': { icon: Users, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-200 dark:border-green-800', label: 'ترحيب' },
  task: { icon: CheckCircle, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-200 dark:border-blue-800', label: 'مهمة' },
  payroll: { icon: MessageSquare, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-emerald-200 dark:border-emerald-800', label: 'رواتب' },
  announcement: { icon: Shield, color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', borderColor: 'border-indigo-200 dark:border-indigo-800', label: 'إعلان' },
  safety: { icon: AlertCircle, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-amber-200 dark:border-amber-800', label: 'سلامة' },
};

const priorityConfig: Record<number, { label: string; color: string; bgColor: string }> = {
  1: { label: 'حرج', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  2: { label: 'عالي', color: 'text-orange-700', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  3: { label: 'متوسط', color: 'text-yellow-700', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  4: { label: 'منخفض', color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  5: { label: 'معلومات', color: 'text-slate-700', bgColor: 'bg-slate-100 dark:bg-slate-800' },
};

const getPriorityNumber = (priority: number | string): number => {
  if (typeof priority === 'number') return priority;
  const map: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4, info: 5 };
  return map[priority] || 3;
};

const groupNotificationsByDate = (notifications: Notification[]): Record<string, Notification[]> => {
  const groups: Record<string, Notification[]> = {};
  notifications.forEach(notification => {
    if (!notification.createdAt) {
      if (!groups['older']) groups['older'] = [];
      groups['older'].push(notification);
      return;
    }
    const date = parseISO(notification.createdAt);
    let groupKey: string;
    if (isToday(date)) groupKey = 'today';
    else if (isYesterday(date)) groupKey = 'yesterday';
    else if (isThisWeek(date)) groupKey = 'thisWeek';
    else if (isThisMonth(date)) groupKey = 'thisMonth';
    else groupKey = 'older';
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(notification);
  });
  return groups;
};

const groupLabels: Record<string, string> = { today: 'اليوم', yesterday: 'أمس', thisWeek: 'هذا الأسبوع', thisMonth: 'هذا الشهر', older: 'أقدم' };
const groupOrder = ['today', 'yesterday', 'thisWeek', 'thisMonth', 'older'];

export default function NotificationsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['today', 'yesterday', 'thisWeek']));
  const userId = user?.id || '';

  const filterConfigs: FilterConfig[] = [
    { key: 'status', label: 'الحالة', type: 'select', options: [{ value: 'all', label: 'الكل' }, { value: 'unread', label: 'غير مقروء' }, { value: 'read', label: 'مقروء' }] },
    { key: 'type', label: 'النوع', type: 'select', options: [{ value: 'all', label: 'الكل' }, { value: 'system', label: 'نظام' }, { value: 'security', label: 'أمان' }, { value: 'maintenance', label: 'صيانة' }, { value: 'task', label: 'مهام' }, { value: 'announcement', label: 'إعلانات' }, { value: 'payroll', label: 'رواتب' }, { value: 'safety', label: 'سلامة' }] },
    { key: 'priority', label: 'الأولوية', type: 'select', options: [{ value: 'all', label: 'الكل' }, { value: '1', label: 'حرج' }, { value: '2', label: 'عالي' }, { value: '3', label: 'متوسط' }, { value: '4', label: 'منخفض' }, { value: '5', label: 'معلومات' }] },
    { key: 'dateRange', label: 'التاريخ', type: 'date-range' },
  ];

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({ status: 'all', type: 'all', priority: 'all', dateRange: undefined });

  const { data: notificationsData, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEYS.notificationsByUser(userId),
    queryFn: async () => {
      const result = await apiRequest(`/api/notifications?limit=100&unreadOnly=false`);
      if (result.success && result.data) return { notifications: result.data, unreadCount: result.unreadCount || 0, total: result.total || result.data.length };
      if (Array.isArray(result)) return { notifications: result, unreadCount: result.filter((n: any) => !n.isRead).length, total: result.length };
      return result.notifications ? result : { notifications: [], unreadCount: 0, total: 0 };
    },
    refetchInterval: 30000,
    enabled: !!userId,
  });

  const notifications = useMemo(() => {
    let result = notificationsData?.notifications || [];
    result = result.map(n => ({ ...n, priority: getPriorityNumber(n.priority), status: n.status || (n.isRead ? 'read' : 'unread') }));
    if (searchValue) {
      const s = searchValue.toLowerCase();
      result = result.filter(n => n.title.toLowerCase().includes(s) || (n.body || n.message || '').toLowerCase().includes(s));
    }
    if (filterValues.status !== 'all') result = result.filter(n => n.status === filterValues.status);
    if (filterValues.type !== 'all') result = result.filter(n => n.type === filterValues.type);
    if (filterValues.priority !== 'all') result = result.filter(n => n.priority === parseInt(filterValues.priority));
    if (filterValues.dateRange?.from) {
      const from = filterValues.dateRange.from;
      const to = filterValues.dateRange.to || new Date();
      result = result.filter(n => { if (!n.createdAt) return false; const d = parseISO(n.createdAt); return d >= from && d <= to; });
    }
    return result;
  }, [notificationsData, searchValue, filterValues]);

  const groupedNotifications = useMemo(() => groupNotificationsByDate(notifications), [notifications]);
  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter(n => n.status === 'unread').length,
    critical: notifications.filter(n => n.priority === 1).length,
    high: notifications.filter(n => n.priority === 2).length,
  }), [notifications]);

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/notifications/${id}/read`, 'POST'),
    onSettled: () => queryClient.refetchQueries({ queryKey: QUERY_KEYS.notificationsByUser(userId) }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => apiRequest('/api/notifications/mark-all-read', 'POST'),
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.notificationsByUser(userId) });
      toast({ title: 'تمت العملية', description: 'تم تعليم جميع الإشعارات كمقروءة' });
      setSelectedIds(new Set());
    },
  });

  const markSelectedAsReadMutation = useMutation({
    mutationFn: async (ids: string[]) => Promise.all(ids.map(id => apiRequest(`/api/notifications/${id}/read`, 'POST'))),
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.notificationsByUser(userId) });
      toast({ title: 'تمت العملية', description: `تم تعليم ${selectedIds.size} إشعار كمقروء` });
      setSelectedIds(new Set());
    },
  });

  const deleteNotificationsMutation = useMutation({
    mutationFn: async (ids: string[]) => Promise.all(ids.map(id => apiRequest(`/api/notifications/${id}`, 'DELETE'))),
    onSuccess: (ids) => {
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.notificationsByUser(userId) });
      toast({ title: 'تم الحذف', description: `تم حذف ${ids.length} إشعار بنجاح` });
      setSelectedIds(new Set());
    },
  });

  const toggleSelection = useCallback((id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const toggleSelectAll = useCallback(() => { if (selectedIds.size === notifications.length) setSelectedIds(new Set()); else setSelectedIds(new Set(notifications.map(n => n.id))); }, [notifications, selectedIds.size]);
  const toggleGroup = useCallback((k: string) => setExpandedGroups(prev => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; }), []);
  const handleFilterChange = useCallback((k: string, v: any) => setFilterValues(p => ({ ...p, [k]: v })), []);
  const handleResetFilters = useCallback(() => { setSearchValue(""); setFilterValues({ status: "all", type: "all", priority: "all", dateRange: undefined }); }, []);

  const statsItems = useMemo(() => [
    { title: "الإجمالي", value: stats.total, icon: Bell, color: "blue" as const },
    { title: "غير مقروء", value: stats.unread, icon: Eye, color: "orange" as const, status: stats.unread > 0 ? "warning" as const : "normal" as const },
    { title: "حرجة", value: stats.critical, icon: AlertOctagon, color: "red" as const, status: stats.critical > 0 ? "critical" as const : "normal" as const },
    { title: "عالية", value: stats.high, icon: Activity, color: "amber" as const }
  ], [stats]);

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const config = notificationTypeConfig[notification.type] || notificationTypeConfig.system;
    const priority = priorityConfig[notification.priority as number] || priorityConfig[3];
    const isUnread = notification.status === 'unread';
    const isSelected = selectedIds.has(notification.id);
    const Icon = config.icon;

    return (
      <div className={cn(
        "group relative flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300",
        isUnread ? "bg-blue-50/40 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
        isSelected && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950 bg-blue-50/50 dark:bg-blue-900/20",
        "hover:shadow-lg active:scale-[0.99]"
      )}>
        <div className="flex flex-col items-center gap-3">
          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelection(notification.id)} className="w-5 h-5 rounded-lg border-2 data-[state=checked]:bg-blue-600 shadow-sm" />
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm relative group-hover:scale-110 transition-transform", config.bgColor)}>
            <Icon className={cn("h-6 w-6", config.color)} />
            {isUnread && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600 border-2 border-white shadow-sm"></span></span>}
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className={cn("text-base font-black leading-tight truncate", isUnread ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-400")}>{notification.title}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={cn("text-[9px] uppercase font-black px-2 py-0.5 rounded-full", priority.bgColor, priority.color)}>{priority.label}</Badge>
                <Badge variant="outline" className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border shadow-sm", config.bgColor, config.color, config.borderColor)}>{config.label}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              {isUnread && <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full" onClick={() => markAsReadMutation.mutate(notification.id)}><Check className="h-4 w-4" /></Button>}
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full" onClick={() => confirm('حذف هذا الإشعار؟') && deleteNotificationsMutation.mutate([notification.id])}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <p className={cn("text-sm line-clamp-2 leading-relaxed", isUnread ? "text-slate-800 dark:text-slate-200 font-medium" : "text-slate-500 dark:text-slate-500")}>{notification.body || notification.message}</p>
          <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><Clock className="h-3 w-3 text-blue-500" /><span>{notification.createdAt && format(parseISO(notification.createdAt), 'dd MMM، HH:mm', { locale: ar })}</span></div>
            {notification.projectId && <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><Package className="h-3 w-3 text-emerald-500" /><span>مشروع: {notification.projectId.substring(0, 8)}</span></div>}
          </div>
        </div>
      </div>
    );
  };

  const NotificationGroup = ({ groupKey, notifications: groupNotifs }: { groupKey: string; notifications: Notification[] }) => {
    const isExpanded = expandedGroups.has(groupKey);
    return (
      <div className="space-y-3">
        <button onClick={() => toggleGroup(groupKey)} className="w-full flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all shadow-sm">
          <div className="flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-transform", isExpanded ? "bg-blue-600 rotate-0" : "bg-slate-100 dark:bg-slate-800 rotate-90")}>
              {isExpanded ? <ChevronDown className="h-4 w-4 text-white" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white">{groupLabels[groupKey]}</span>
            <Badge variant="secondary" className="h-5 px-2 text-[10px] font-black rounded-full">{groupNotifs.length}</Badge>
          </div>
        </button>
        {isExpanded && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in zoom-in-95 duration-300">{groupNotifs.map(n => <NotificationCard key={n.id} notification={n} />)}</div>}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      <div className="flex-1 p-4 md:p-8 space-y-8 max-w-8xl mx-auto w-full">
        <UnifiedStats stats={statsItems} columns={4} />
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border shadow-lg">
          <UnifiedFilterDashboard
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            filters={filterConfigs}
            onReset={handleResetFilters}
            onRefresh={() => refetch()}
            isRefreshing={isLoading}
            searchPlaceholder="بحث في الإشعارات..."
            title="تصفية الإشعارات"
            actions={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold px-4" onClick={() => markAllAsReadMutation.mutate()} disabled={stats.unread === 0}>تعليم الكل كمقروء</Button>
                <Button variant="ghost" size="sm" className="h-10 rounded-xl font-bold px-4" onClick={toggleSelectAll}>{selectedIds.size === notifications.length ? 'إلغاء التحديد' : 'تحديد الكل'}</Button>
              </div>
            }
          />
        </div>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-8 pb-10 pt-2">
            {isLoading ? <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div> :
             notifications.length > 0 ? groupOrder.map(k => groupedNotifications[k]?.length ? <NotificationGroup key={k} groupKey={k} notifications={groupedNotifications[k]} /> : null) :
             <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
               <div className="w-20 h-20 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-6 ring-8 ring-slate-50/50"><Bell className="h-10 w-10 text-slate-300 animate-bounce" /></div>
               <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">لا توجد إشعارات</h3>
               <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8 font-medium">صندوق الوارد نظيف تماماً! سنقوم بإخطارك فور حدوث أي شيء مهم.</p>
             </div>}
          </div>
        </ScrollArea>
      </div>

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-slate-900 dark:bg-blue-600 text-white p-4 rounded-3xl shadow-2xl border border-white/10 flex items-center gap-6 min-w-[400px] backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 border-l border-white/20">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-lg">{selectedIds.size}</div>
              <span className="font-black text-sm whitespace-nowrap">عناصر مختارة</span>
            </div>
            
            <div className="flex items-center gap-2 flex-1">
              <Button 
                variant="ghost" 
                className="flex-1 h-12 rounded-2xl font-black text-sm hover:bg-white/10 text-white gap-2"
                onClick={() => markSelectedAsReadMutation.mutate(Array.from(selectedIds))}
                disabled={markSelectedAsReadMutation.isPending}
              >
                <CheckCheck className="h-5 w-5" />
                تعليم كمقروء
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 h-12 rounded-2xl font-black text-sm bg-red-600 hover:bg-red-700 text-white gap-2 shadow-lg"
                onClick={() => confirm(`هل أنت متأكد من حذف ${selectedIds.size} إشعار؟`) && deleteNotificationsMutation.mutate(Array.from(selectedIds))}
                disabled={deleteNotificationsMutation.isPending}
              >
                <Trash2 className="h-5 w-5" />
                حذف المحدد
              </Button>
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-12 w-12 rounded-2xl hover:bg-white/10 text-white"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
