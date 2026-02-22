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
  ChevronDown, ChevronRight, Info, AlertOctagon, Activity
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
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
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
        "group relative flex items-start gap-3 p-4 rounded-xl border transition-all duration-200",
        isUnread ? "bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
        isSelected && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900",
        "hover:shadow-md active:scale-[0.99]"
      )}>
        <Checkbox checked={isSelected} onCheckedChange={() => toggleSelection(notification.id)} className="mt-1" />
        <div className={cn("flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center", config.bgColor)}>
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn("text-sm font-semibold truncate", isUnread ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-400")}>{notification.title}</h3>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priority.bgColor, priority.color)}>{priority.label}</Badge>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{notification.body || notification.message}</p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500">{notification.createdAt && format(parseISO(notification.createdAt), 'HH:mm', { locale: ar })}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isUnread && <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-blue-600" onClick={() => markAsReadMutation.mutate(notification.id)}>مقروء</Button>}
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-red-500" onClick={() => confirm('حذف؟') && deleteNotificationsMutation.mutate([notification.id])}>حذف</Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const NotificationGroup = ({ groupKey, notifications: groupNotifs }: { groupKey: string; notifications: Notification[] }) => {
    const isExpanded = expandedGroups.has(groupKey);
    return (
      <div className="space-y-2">
        <button onClick={() => toggleGroup(groupKey)} className="w-full flex items-center gap-2 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{groupLabels[groupKey]}</span>
          <Badge variant="secondary" className="h-4 px-1 text-[9px]">{groupNotifs.length}</Badge>
        </button>
        {isExpanded && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{groupNotifs.map(n => <NotificationCard key={n.id} notification={n} />)}</div>}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
      <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
        <UnifiedStats stats={statsItems} columns={4} />
        <UnifiedFilterDashboard
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          filters={filterConfigs}
          onReset={handleResetFilters}
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
          searchPlaceholder="بحث..."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => markAllAsReadMutation.mutate()} disabled={stats.unread === 0}>تعليم الكل كمقروء</Button>
              {selectedIds.size > 0 && <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => confirm(`حذف ${selectedIds.size}؟`) && deleteNotificationsMutation.mutate(Array.from(selectedIds))}>حذف المحدد</Button>}
            </div>
          }
        />
        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-6 pb-6 pt-2">
            {isLoading ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div> :
             notifications.length > 0 ? groupOrder.map(k => groupedNotifications[k]?.length ? <NotificationGroup key={k} groupKey={k} notifications={groupedNotifications[k]} /> : null) :
             <div className="flex flex-col items-center justify-center py-20 text-slate-400"><Bell className="h-12 w-12 mb-2 opacity-20" /><p className="text-sm">لا توجد إشعارات</p></div>}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
