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
  system: { 
    icon: Shield, 
    color: 'text-slate-600', 
    bgColor: 'bg-slate-100 dark:bg-slate-800', 
    borderColor: 'border-slate-200 dark:border-slate-700',
    label: 'نظام'
  },
  security: { 
    icon: Shield, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50 dark:bg-red-900/20', 
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'أمان'
  },
  maintenance: { 
    icon: Wrench, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50 dark:bg-orange-900/20', 
    borderColor: 'border-orange-200 dark:border-orange-800',
    label: 'صيانة'
  },
  warranty: { 
    icon: Package, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50 dark:bg-purple-900/20', 
    borderColor: 'border-purple-200 dark:border-purple-800',
    label: 'ضمان'
  },
  damaged: { 
    icon: AlertTriangle, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50 dark:bg-red-900/20', 
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'تلف'
  },
  'user-welcome': { 
    icon: Users, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50 dark:bg-green-900/20', 
    borderColor: 'border-green-200 dark:border-green-800',
    label: 'ترحيب'
  },
  task: { 
    icon: CheckCircle, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 dark:bg-blue-900/20', 
    borderColor: 'border-blue-200 dark:border-blue-800',
    label: 'مهمة'
  },
  payroll: { 
    icon: MessageSquare, 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', 
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    label: 'رواتب'
  },
  announcement: { 
    icon: Shield, 
    color: 'text-indigo-600', 
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', 
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    label: 'إعلان'
  },
  safety: { 
    icon: AlertCircle, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50 dark:bg-amber-900/20', 
    borderColor: 'border-amber-200 dark:border-amber-800',
    label: 'سلامة'
  },
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
      if (!groups['older']) {
        groups['older'] = [];
      }
      groups['older'].push(notification);
      return;
    }
    
    const date = parseISO(notification.createdAt);
    let groupKey: string;
    
    if (isToday(date)) {
      groupKey = 'today';
    } else if (isYesterday(date)) {
      groupKey = 'yesterday';
    } else if (isThisWeek(date)) {
      groupKey = 'thisWeek';
    } else if (isThisMonth(date)) {
      groupKey = 'thisMonth';
    } else {
      groupKey = 'older';
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
  });
  
  return groups;
};

const groupLabels: Record<string, string> = {
  today: 'اليوم',
  yesterday: 'أمس',
  thisWeek: 'هذا الأسبوع',
  thisMonth: 'هذا الشهر',
  older: 'أقدم',
};

const groupOrder = ['today', 'yesterday', 'thisWeek', 'thisMonth', 'older'];

export default function NotificationsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['today', 'yesterday', 'thisWeek']));
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  const userId = user?.id || '';

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'الحالة',
      type: 'select',
      placeholder: 'اختر الحالة',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'الكل' },
        { value: 'unread', label: 'غير مقروء' },
        { value: 'read', label: 'مقروء' },
      ],
    },
    {
      key: 'type',
      label: 'النوع',
      type: 'select',
      placeholder: 'اختر النوع',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع الأنواع' },
        { value: 'system', label: 'نظام' },
        { value: 'security', label: 'أمان' },
        { value: 'maintenance', label: 'صيانة' },
        { value: 'task', label: 'مهام' },
        { value: 'announcement', label: 'إعلانات' },
        { value: 'payroll', label: 'رواتب' },
        { value: 'safety', label: 'سلامة' },
      ],
    },
    {
      key: 'priority',
      label: 'الأولوية',
      type: 'select',
      placeholder: 'اختر الأولوية',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع الأولويات' },
        { value: '1', label: 'حرج' },
        { value: '2', label: 'عالي' },
        { value: '3', label: 'متوسط' },
        { value: '4', label: 'منخفض' },
        { value: '5', label: 'معلومات' },
      ],
    },
    {
      key: 'dateRange',
      label: 'نطاق التاريخ',
      type: 'date-range',
    },
  ];

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: 'all',
    type: 'all',
    priority: 'all',
    dateRange: undefined,
  });

  const { data: notificationsData, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEYS.notificationsByUser(userId),
    queryFn: async () => {
      try {
        const result = await apiRequest(`/api/notifications?limit=100&unreadOnly=false`);
        if (result.success && result.data) {
          return {
            notifications: result.data,
            unreadCount: result.unreadCount || 0,
            total: result.total || result.data.length
          };
        }
        if (Array.isArray(result)) {
          return {
            notifications: result,
            unreadCount: result.filter((n: any) => !n.isRead).length,
            total: result.length
          };
        }
        return result.notifications ? result : { notifications: [], unreadCount: 0, total: 0 };
      } catch (error) {
        return { notifications: [], unreadCount: 0, total: 0 };
      }
    },
    refetchInterval: 30000,
    enabled: !!userId,
  });

  const notifications = useMemo(() => {
    let result = notificationsData?.notifications || [];
    result = result.map(n => ({
      ...n,
      priority: getPriorityNumber(n.priority),
      status: n.status || (n.isRead ? 'read' : 'unread'),
    }));
    if (searchValue) {
      const search = searchValue.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(search) ||
        (n.body || n.message || '').toLowerCase().includes(search)
      );
    }
    if (filterValues.status && filterValues.status !== 'all') {
      result = result.filter(n => n.status === filterValues.status);
    }
    if (filterValues.type && filterValues.type !== 'all') {
      result = result.filter(n => n.type === filterValues.type);
    }
    if (filterValues.priority && filterValues.priority !== 'all') {
      result = result.filter(n => n.priority === parseInt(filterValues.priority));
    }
    const dateRange = filterValues.dateRange as { from?: Date; to?: Date } | undefined;
    if (dateRange?.from) {
      const from = dateRange.from;
      const to = dateRange.to || new Date();
      result = result.filter(n => {
        if (!n.createdAt) return false;
        const date = parseISO(n.createdAt);
        return date >= from && date <= to;
      });
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
    mutationFn: async (notificationId: string) => apiRequest(`/api/notifications/${notificationId}/read`, 'POST'),
    onSettled: () => queryClient.refetchQueries({ queryKey: QUERY_KEYS.notificationsByUser(userId) }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => apiRequest('/api/notifications/mark-all-read', 'POST'),
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.notificationsByUser(userId) });
      toast({ title: 'تم بنجاح', description: 'تم تعليم جميع الإشعارات كمقروءة' });
      setSelectedIds(new Set());
    },
  });

  const markSelectedAsReadMutation = useMutation({
    mutationFn: async (ids: string[]) => Promise.all(ids.map(id => apiRequest(`/api/notifications/${id}/read`, 'POST'))),
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.notificationsByUser(userId) });
      toast({ title: 'تم بنجاح', description: `تم تعليم ${selectedIds.size} إشعار كمقروء` });
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

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === notifications.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(notifications.map(n => n.id)));
  }, [notifications, selectedIds.size]);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey);
      return next;
    });
  }, []);

  const handleFilterChange = useCallback((key: string, value: any) => setFilterValues(prev => ({ ...prev, [key]: value })), []);
  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({ status: "all", type: "all", priority: "all", dateRange: undefined });
  }, []);

  const statsItems = useMemo(() => [
    { title: "إجمالي الإشعارات", value: stats.total, icon: Bell, color: "blue" as const },
    { title: "غير مقروء", value: stats.unread, icon: Eye, color: "orange" as const, status: stats.unread > 0 ? "warning" as const : "normal" as const },
    { title: "تنبيهات حرجة", value: stats.critical, icon: AlertOctagon, color: "red" as const, status: stats.critical > 0 ? "critical" as const : "normal" as const },
    { title: "أولوية عالية", value: stats.high, icon: Activity, color: "amber" as const }
  ], [stats]);

  const formatNotificationTime = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    const date = parseISO(dateString);
    return isToday(date) ? format(date, 'HH:mm', { locale: ar }) : format(date, 'dd MMM، HH:mm', { locale: ar });
  };

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const config = notificationTypeConfig[notification.type] || notificationTypeConfig.system;
    const priority = priorityConfig[notification.priority as number] || priorityConfig[3];
    const isUnread = notification.status === 'unread';
    const isSelected = selectedIds.has(notification.id);
    const Icon = config.icon;

    return (
      <div className={cn(
        "group relative flex items-start gap-4 p-5 rounded-[1.5rem] border transition-all duration-300 shadow-sm",
        isUnread ? "bg-gradient-to-br from-blue-50/50 via-white to-white dark:from-blue-900/10 border-blue-200 dark:border-blue-800" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
        isSelected && "ring-2 ring-blue-500 ring-offset-4 bg-blue-50/30 border-blue-300",
        "hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
      )}>
        <div className="flex flex-col items-center gap-4">
          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelection(notification.id)} className="w-5 h-5 rounded-lg border-2 data-[state=checked]:bg-blue-600 shadow-sm" />
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 shadow-lg relative", config.bgColor)}>
            <Icon className={cn("h-7 w-7", config.color)} />
            {isUnread && <span className="absolute -top-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-sm"></span></span>}
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className={cn("text-lg font-black leading-tight tracking-tight", isUnread ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-400")}>{notification.title}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={cn("text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border-none shadow-sm", priority.bgColor, priority.color)}>{priority.label}</Badge>
                <Badge variant="outline" className={cn("text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-sm", config.bgColor, config.color, config.borderColor)}>{config.label}</Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><MoreVertical className="h-5 w-5 text-slate-400" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl shadow-2xl" dir="rtl">
                <DropdownMenuItem onClick={() => markAsReadMutation.mutate(notification.id)} className="rounded-xl gap-3 py-2.5 font-bold"><Eye className="h-4 w-4 text-blue-500" /> تعليم كمقروء</DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuItem onClick={() => confirm('حذف؟') && deleteNotificationsMutation.mutate([notification.id])} className="text-red-600 rounded-xl gap-3 py-2.5 font-bold"><Trash2 className="h-4 w-4" /> حذف الإشعار</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className={cn("text-[0.95rem] line-clamp-3 leading-relaxed", isUnread ? "text-slate-800 dark:text-slate-200 font-semibold" : "text-slate-500 dark:text-slate-500")}>{notification.body || notification.message || 'لا يوجد محتوى لهذا الإشعار'}</p>
          <div className="flex flex-wrap items-center justify-between pt-4 gap-4 border-t border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/50"><Clock className="h-4 w-4 text-blue-500" /><span>{formatNotificationTime(notification.createdAt)}</span></div>
              {notification.projectId && <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/50"><Package className="h-4 w-4 text-emerald-500" /><span>مشروع: {notification.projectId.substring(0, 8)}</span></div>}
            </div>
            <div className="flex items-center gap-2">
              {notification.payload?.action === 'open_task' && <Button size="sm" variant="default" className="h-9 px-5 text-xs font-black gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-500/20" onClick={() => window.location.href = `/tasks/${notification.payload.taskId}`}><Zap className="h-4 w-4 fill-white" />انتقل للمهمة</Button>}
              {isUnread && <Button size="sm" variant="outline" className="h-9 px-5 text-xs font-black gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 rounded-full shadow-sm" onClick={() => markAsReadMutation.mutate(notification.id)} disabled={markAsReadMutation.isPending}><CheckCircle className="h-4 w-4" />تمت القراءة</Button>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const NotificationGroup = ({ groupKey, notifications: groupNotifs }: { groupKey: string; notifications: Notification[] }) => {
    const isExpanded = expandedGroups.has(groupKey);
    const unreadCount = groupNotifs.filter(n => n.status === 'unread').length;
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <button onClick={() => toggleGroup(groupKey)} className="w-full flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300", isExpanded ? "bg-blue-600 rotate-0" : "bg-slate-100 dark:bg-slate-800 rotate-90")}>
              {isExpanded ? <ChevronDown className="h-5 w-5 text-white" /> : <ChevronRight className="h-5 w-5 text-slate-500" />}
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight block">{groupLabels[groupKey]}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{groupNotifs.length} إشعار</span>
                {unreadCount > 0 && <Badge className="bg-blue-600 text-white text-[10px] font-black h-5 px-2">{unreadCount} غير مقروء</Badge>}
              </div>
            </div>
          </div>
          <div className="flex-1 mx-8 h-px bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent" />
        </button>
        {isExpanded && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-300">{groupNotifs.map(notification => <NotificationCard key={notification.id} notification={notification} />)}</div>}
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-4"><Skeleton className="w-14 h-14 rounded-2xl bg-slate-100" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-3/4 rounded-full" /><Skeleton className="h-3 w-1/2 rounded-full" /></div></div>
          <Skeleton className="h-20 w-full rounded-2xl" /><div className="flex justify-between items-center pt-2"><Skeleton className="h-8 w-24 rounded-full" /><Skeleton className="h-8 w-20 rounded-full" /></div>
        </div>
      ))}
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 shadow-inner">
      <div className="w-28 h-28 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-8 ring-8 ring-slate-50/50"><Bell className="h-14 w-14 text-slate-300 animate-bounce" /></div>
      <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">صندوق الوارد نظيف تماماً!</h3>
      <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mb-10 font-medium leading-relaxed">لا توجد تنبيهات جديدة حالياً. استمتع بيومك!</p>
      <Button variant="default" onClick={handleResetFilters} className="rounded-[1.5rem] h-14 px-10 font-black text-lg bg-blue-600 shadow-xl shadow-blue-500/20 transition-all active:scale-95"><RefreshCw className="h-5 w-5 ml-3" />تحديث القائمة</Button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 p-4 md:p-8 lg:p-12 space-y-10 max-w-8xl mx-auto w-full">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[100px] rounded-full -mr-48 -mt-48 group-hover:bg-blue-500/10 transition-all duration-1000" />
          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-10">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl animate-in zoom-in duration-700"><Bell className="h-10 w-10 text-white" /></div>
              <div className="space-y-1"><h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none">مركز الإشعارات</h1><p className="text-lg text-slate-500 dark:text-slate-400 font-bold max-w-lg">واجهة تفاعلية متطورة لمتابعة كافة الأنشطة والتنبيهات والمهام في الوقت الفعلي.</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl animate-in slide-in-from-top-4">
                  <span className="px-4 text-sm font-black text-blue-600">{selectedIds.size} مختارة</span>
                  <Button variant="default" size="sm" className="h-11 px-6 rounded-xl font-black bg-blue-600" onClick={() => markSelectedAsReadMutation.mutate(Array.from(selectedIds))}><CheckCheck className="ml-2 h-4 w-4" />مقروء</Button>
                  <Button variant="destructive" size="sm" className="h-11 px-6 rounded-xl font-black" onClick={() => confirm('حذف المختارة؟') && deleteNotificationsMutation.mutate(Array.from(selectedIds))}><Trash2 className="ml-2 h-4 w-4" />حذف</Button>
                </div>
              )}
              <Button variant="outline" size="lg" className="h-14 px-8 rounded-[1.25rem] font-black border-2 transition-all shadow-sm" onClick={toggleSelectAll}>{selectedIds.size === notifications.length ? 'إلغاء التحديد' : 'تحديد الكل'}</Button>
              <Button variant="default" size="lg" className="h-14 px-8 rounded-[1.25rem] font-black bg-slate-900 dark:bg-blue-600 hover:scale-105 transition-all shadow-2xl active:scale-95 text-white" onClick={() => markAllAsReadMutation.mutate()} disabled={markAllAsReadMutation.isPending || stats.unread === 0}><CheckCheck className="ml-3 h-5 w-5" />تعليم الكل كمقروء</Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {statsItems.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className={cn("bg-white dark:bg-slate-900 p-8 rounded-[2rem] border shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4", idx === 1 && stat.value > 0 && "ring-2 ring-orange-500/50", idx === 2 && stat.value > 0 && "ring-2 ring-red-500/50")} style={{ animationDelay: `${idx * 100}ms` }}>
                <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-16 -mt-16 opacity-10", stat.color === 'blue' ? "bg-blue-600" : stat.color === 'orange' ? "bg-orange-600" : stat.color === 'red' ? "bg-red-600" : "bg-amber-600")} />
                <div className="flex items-center justify-between relative z-10">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", stat.color === 'blue' ? "bg-blue-50 text-blue-600" : stat.color === 'orange' ? "bg-orange-50 text-orange-600" : stat.color === 'red' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}><Icon className="h-7 w-7" /></div>
                  <div className="text-left"><span className="text-4xl font-black text-slate-900 dark:text-white block tabular-nums">{stat.value}</span><span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.title}</span></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border shadow-lg">
          <UnifiedFilterDashboard searchValue={searchValue} onSearchChange={setSearchValue} filterValues={filterValues} onFilterChange={handleFilterChange} filters={filterConfigs} onReset={handleResetFilters} onRefresh={() => refetch()} isRefreshing={isLoading} searchPlaceholder="ابحث عن إشعار محدد..." title="تصفية ذكية" />
        </div>
        <div className="space-y-12 pb-24">
          {isLoading ? <LoadingSkeleton /> : notifications.length > 0 ? groupOrder.map(groupKey => {
            const groupNotifs = groupedNotifications[groupKey];
            if (!groupNotifs || groupNotifs.length === 0) return null;
            return <NotificationGroup key={groupKey} groupKey={groupKey} notifications={groupNotifs} />;
          }) : <EmptyState />}
        </div>
      </div>
    </div>
  );
}
