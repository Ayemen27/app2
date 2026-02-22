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
    { title: "تحذير", value: stats.high, icon: Activity, color: "amber" as const, status: stats.high > 0 ? "warning" as const : "normal" as const }
  ], [stats]);

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const config = notificationTypeConfig[notification.type] || notificationTypeConfig.system;
    const priority = priorityConfig[notification.priority as number] || priorityConfig[3];
    const isUnread = notification.status === 'unread';
    const isSelected = selectedIds.has(notification.id);
    const [isExpanded, setIsExpanded] = React.useState(false);
    const Icon = config.icon;
    const message = notification.body || notification.message || '';
    const isLongMessage = message.length > 60;

    return (
      <div className={cn(
        "group relative flex items-start gap-3 p-2 px-3 rounded-xl border transition-all duration-300",
        isUnread ? "bg-blue-50/40 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
        isSelected && "ring-2 ring-blue-500 ring-offset-0 bg-blue-50/50 dark:bg-blue-900/20",
        "hover:shadow-sm active:scale-[0.995]"
      )}>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelection(notification.id)} className="w-4 h-4 rounded border-2 data-[state=checked]:bg-blue-600 shadow-sm" />
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shadow-sm relative group-hover:scale-105 transition-transform", config.bgColor)}>
            <Icon className={cn("h-4 w-4", config.color)} />
            {isUnread && <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 border border-white shadow-sm"></span></span>}
          </div>
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col min-w-0">
              <h3 className={cn("text-sm font-black leading-tight truncate", isUnread ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-400")}>
                {notification.title}
                {!isExpanded && (
                  <span className={cn("mx-2 text-[12px] font-medium hidden sm:inline", isUnread ? "text-slate-700 dark:text-slate-300" : "text-slate-500")}>
                    - {message}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className={cn("text-[8px] uppercase font-black px-1.5 py-0 rounded-full", priority.bgColor, priority.color)}>{priority.label}</Badge>
                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                  <Clock className="h-2.5 w-2.5 text-blue-400" />
                  <span>{notification.createdAt && format(parseISO(notification.createdAt), 'HH:mm', { locale: ar })}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isLongMessage && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'طي' : 'عرض المزيد'}
                </Button>
              )}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                {isUnread && <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full" onClick={() => markAsReadMutation.mutate(notification.id)}><Check className="h-3.5 w-3.5" /></Button>}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full" onClick={() => confirm('حذف هذا الإشعار؟') && deleteNotificationsMutation.mutate([notification.id])}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 animate-in fade-in slide-in-from-top-1 duration-200 pb-2">
              {message}
            </div>
          )}
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
        <UnifiedStats stats={statsItems} columns={3} />
        
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
          title=""
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold px-4" onClick={() => markAllAsReadMutation.mutate()} disabled={stats.unread === 0}>تعليم الكل كمقروء</Button>
              <Button variant="ghost" size="sm" className="h-10 rounded-xl font-bold px-4" onClick={toggleSelectAll}>{selectedIds.size === notifications.length ? 'إلغاء التحديد' : 'تحديد الكل'}</Button>
            </div>
          }
        />

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
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-10 duration-500 w-[94%] max-w-3xl">
          <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl px-3 py-2.5 rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.5)] border border-white/20 dark:border-slate-700/50 ring-1 ring-black/5 dark:ring-white/5">
            <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-indigo-600 rounded-[2rem] text-white shadow-lg shrink-0">
              <span className="flex items-center justify-center w-7 h-7 bg-white/25 rounded-full text-xs font-black ring-2 ring-white/10">{selectedIds.size}</span>
              <span className="font-black text-xs tracking-tight whitespace-nowrap hidden xs:inline">مختارة</span>
            </div>

            <div className="flex items-center gap-1 flex-1 px-1">
              <Button 
                variant="ghost" 
                size="sm"
                className="flex-1 h-12 rounded-2xl font-black text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 gap-1.5 transition-all active:scale-95 group"
                onClick={toggleSelectAll}
              >
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                  <CheckCheck className="h-4 w-4 text-slate-600 dark:text-slate-400 group-hover:text-blue-600" />
                </div>
                <span className="hidden sm:inline">تحديد الكل</span>
                <span className="sm:hidden">الكل</span>
              </Button>

              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1 opacity-50" />

              <Button 
                variant="ghost" 
                size="sm"
                className="flex-1 h-12 rounded-2xl font-black text-[11px] hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 gap-1.5 transition-all active:scale-95 group"
                onClick={() => markSelectedAsReadMutation.mutate(Array.from(selectedIds))}
                disabled={markSelectedAsReadMutation.isPending}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="hidden sm:inline">مقروء</span>
                <span className="sm:hidden">قراءة</span>
              </Button>
              
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1 opacity-50" />

              <Button 
                variant="ghost" 
                size="sm"
                className="flex-1 h-12 rounded-2xl font-black text-[11px] hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 gap-1.5 transition-all active:scale-95 group"
                onClick={() => confirm(`هل أنت متأكد من حذف ${selectedIds.size} إشعار؟`) && deleteNotificationsMutation.mutate(Array.from(selectedIds))}
                disabled={deleteNotificationsMutation.isPending}
              >
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Trash2 className="h-4 w-4 text-red-600" />
                </div>
                <span className="hidden sm:inline">حذف</span>
                <span className="sm:hidden">حذف</span>
              </Button>
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 dark:text-slate-500 transition-all shrink-0"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
