
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { CreateNotificationDialog } from '@/components/notifications/CreateNotificationDialog';
import { 
  TrendingUp, Bell, Users, Zap, BarChart3, AlertCircle, CheckCircle2,
  Filter, Search, Calendar, Clock, Eye, Trash2, Send, Star,
  Activity, Target, Award, Sparkles, MessageSquare, Settings,
  ChevronRight, RefreshCw, Download, Upload, MoreVertical,
  CheckCheck, XCircle, AlertTriangle, Info, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const { isAuthenticated, getAccessToken, isLoading: isAuthLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [filters, setFilters] = useState({ type: '', priority: '', search: '', limit: 50 });
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': getAccessToken() ? `Bearer ${getAccessToken()}` : '',
  });

  // جلب البيانات
  const { data: notificationsData, isLoading: isLoadingNotifications, refetch } = useQuery({
    queryKey: ['admin-notifications', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        requesterId: 'admin',
        limit: filters.limit.toString(),
        ...(filters.type && { type: filters.type }),
        ...(filters.priority && { priority: filters.priority })
      });
      const response = await fetch(`/api/admin/notifications/all?${params}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل في جلب البيانات');
      return response.json();
    },
    enabled: isAuthenticated && !isAuthLoading
  });

  const { data: activityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['user-activity'],
    queryFn: async () => {
      const response = await fetch('/api/admin/notifications/user-activity?requesterId=admin', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل في جلب النشاط');
      return response.json();
    },
    enabled: isAuthenticated && !isAuthLoading
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/notifications/${id}?requesterId=admin`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم حذف الإشعار', variant: 'default' });
      refetch();
    }
  });

  const notifications = notificationsData?.notifications || [];
  const stats = useMemo(() => ({
    total: notificationsData?.total || 0,
    unread: notifications.filter((n: any) => !n.isRead).length,
    critical: notifications.filter((n: any) => n.priority === 5).length,
    readRate: Math.round(
      (notifications.filter((n: any) => n.isRead).length / Math.max(notifications.length, 1)) * 100
    )
  }), [notificationsData, notifications]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" dir="rtl">
      {/* Header Section */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="px-2 py-2 md:px-6 md:py-4">
          <div className="flex items-center justify-between gap-2 md:gap-3">
            {/* العنوان مع الأيقونة */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/30 ring-2 ring-white dark:ring-slate-900">
                  <Bell className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                {stats.unread > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg animate-pulse ring-2 ring-white dark:ring-slate-900">
                    {stats.unread}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white truncate">
                  مركز الإشعارات
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium hidden md:block">
                  إدارة ومراقبة متقدمة
                </p>
              </div>
            </div>

            {/* الأزرار */}
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoadingNotifications}
                className="gap-1 md:gap-2 border-2 h-9 md:h-10 px-2 md:px-3"
              >
                <RefreshCw className={cn("h-4 w-4", isLoadingNotifications && "animate-spin")} />
                <span className="hidden md:inline text-xs md:text-sm">تحديث</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-2 h-9 md:h-10 px-2">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="gap-2 text-xs md:text-sm">
                    <Download className="h-4 w-4" />
                    تصدير البيانات
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-xs md:text-sm">
                    <Upload className="h-4 w-4" />
                    استيراد بيانات
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-xs md:text-sm">
                    <Settings className="h-4 w-4" />
                    الإعدادات
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-3 md:px-6 md:py-6 w-full">
          {/* Quick Stats Cards - 3 بطائق أفقية */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-8">
            <StatsCard
              icon={Bell}
              label="إجمالي الإشعارات"
              value={stats.total.toLocaleString()}
              gradient="from-blue-500 to-cyan-500"
              iconBg="bg-blue-100 dark:bg-blue-900/30"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatsCard
              icon={AlertCircle}
              label="إشعارات حرجة"
              value={stats.critical.toLocaleString()}
              gradient="from-red-500 to-rose-500"
              iconBg="bg-red-100 dark:bg-red-900/30"
              iconColor="text-red-600 dark:text-red-400"
              pulse={stats.critical > 0}
            />
            <StatsCard
              icon={CheckCircle2}
              label="معدل القراءة"
              value={`${stats.readRate}%`}
              gradient="from-green-500 to-emerald-500"
              iconBg="bg-green-100 dark:bg-green-900/30"
              iconColor="text-green-600 dark:text-green-400"
            />
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-3 md:space-y-6">
            {/* Tabs Navigation */}
            <div className="bg-gradient-to-r from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-lg md:rounded-xl p-3 md:p-6 shadow-lg md:shadow-xl border-2 border-slate-200 dark:border-slate-700">
              <TabsList className="flex w-full gap-1 md:gap-3 bg-transparent p-0 h-auto justify-start overflow-x-auto">
                <TabTriggerEnhanced value="overview" icon={BarChart3} label="لوحة التحكم" />
                <TabTriggerEnhanced value="notifications" icon={Bell} label="الإشعارات" badge={stats.unread} />
                <TabTriggerEnhanced value="users" icon={Users} label="المستخدمين" />
                <TabTriggerEnhanced value="create" icon={Zap} label="إنشاء جديد" />
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-3 md:space-y-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
                {/* Activity Chart */}
                <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 md:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white text-base md:text-lg">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg flex-shrink-0">
                          <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
                        </div>
                        أكثر المستخدمين نشاطاً
                      </CardTitle>
                      <Badge variant="outline" className="bg-white dark:bg-slate-800 text-xs flex-shrink-0">
                        7 أيام
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 md:p-5 h-80 md:h-96">
                    {isLoadingActivity ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))}
                      </div>
                    ) : (
                      <ScrollArea className="h-full">
                        <div className="space-y-3 pr-4">
                          {activityData?.userStats?.slice(0, 10).map((user: any, i: number) => (
                            <UserActivityCard key={user.userId} user={user} rank={i + 1} />
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                {/* Performance Summary */}
                <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-4 md:p-5">
                    <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white text-base md:text-lg">
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Activity className="h-5 w-5 md:h-6 md:w-6 text-white" />
                      </div>
                      ملخص الأداء
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-5 space-y-3">
                    <PerformanceMetric
                      label="معدل الفتح"
                      value={`${stats.readRate}%`}
                      icon={Eye}
                      color="text-green-600 dark:text-green-400"
                      bgColor="bg-green-100 dark:bg-green-900/30"
                    />
                    <PerformanceMetric
                      label="غير مقروء"
                      value={stats.unread}
                      icon={AlertTriangle}
                      color="text-orange-600 dark:text-orange-400"
                      bgColor="bg-orange-100 dark:bg-orange-900/30"
                    />
                    <PerformanceMetric
                      label="إشعارات حرجة"
                      value={stats.critical}
                      icon={AlertCircle}
                      color={stats.critical > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"}
                      bgColor={stats.critical > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-slate-100 dark:bg-slate-800"}
                    />
                    
                    <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700">
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 h-10 text-sm">
                        <Target className="h-4 w-4 ml-2" />
                        التقرير الشامل
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-3 md:space-y-6 mt-0">
              {/* Search and Filter Bar */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                <CardContent className="p-3 md:p-5">
                  <div className="flex flex-col gap-2 md:gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="ابحث..."
                        className="pr-10 border-2 h-9 md:h-10 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-sm"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="gap-1 md:gap-2 h-9 md:h-10 border-2 px-2 md:px-4 text-xs md:text-sm flex-1 md:flex-none">
                        <Filter className="h-4 w-4" />
                        <span className="hidden md:inline">فلترة</span>
                      </Button>
                      <Button className="gap-1 md:gap-2 h-9 md:h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-2 md:px-4 shadow-lg shadow-blue-500/30 text-xs md:text-sm flex-1 md:flex-none">
                        <RefreshCw className={cn("h-4 w-4", isLoadingNotifications && "animate-spin")} />
                        <span className="hidden md:inline">تحديث</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications List */}
              <div className="space-y-3 md:space-y-4">
                {isLoadingNotifications ? (
                  <LoadingNotifications />
                ) : notifications.length === 0 ? (
                  <EmptyNotifications />
                ) : (
                  <div className="space-y-4">
                    {notifications.map((notif: any) => (
                      <NotificationCardEnhanced
                        key={notif.id}
                        notification={notif}
                        onDelete={() => deleteMutation.mutate(notif.id)}
                        onView={() => setSelectedNotification(notif.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-0">
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-3 md:p-5">
                  <CardTitle className="flex items-center gap-2 md:gap-3 text-slate-900 dark:text-white text-base md:text-lg">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0">
                      <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    نشاط المستخدمين
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-4 max-h-96 overflow-y-auto">
                  {isLoadingActivity ? (
                    <LoadingUsers />
                  ) : (
                    <div className="space-y-2 md:space-y-3">
                      {activityData?.userStats?.map((user: any, i: number) => (
                        <UserActivityCard key={user.userId} user={user} rank={i + 1} detailed />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Create Tab */}
            <TabsContent value="create" className="mt-0">
              <CreateNotificationCard onRefetch={refetch} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Enhanced Components
const StatsCard = ({ icon: Icon, label, value, gradient, iconBg, iconColor, pulse }: any) => (
  <Card className={cn(
    "relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-lg hover:shadow-xl transition-all group cursor-pointer",
    pulse && "animate-pulse"
  )}>
    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity", gradient)} />
    <CardContent className="p-3 md:p-4 relative">
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110", iconBg)}>
          <Icon className={cn("h-4 w-4 md:h-5 md:w-5", iconColor)} />
        </div>
        <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-0.5">{value}</p>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</p>
    </CardContent>
  </Card>
);

const TabTriggerEnhanced = ({ value, icon: Icon, label, badge }: any) => (
  <TabsTrigger
    value={value}
    className="relative flex-shrink-0 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:via-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all h-9 md:h-11 px-2 md:px-4 font-semibold border-2 border-transparent data-[state=active]:border-blue-400 dark:data-[state=active]:border-blue-500 whitespace-nowrap text-xs md:text-sm"
  >
    <div className="flex items-center gap-1.5 md:gap-2">
      <Icon className="h-4 w-4 md:h-5 md:w-5" />
      <span className="font-semibold hidden sm:inline">{label}</span>
    </div>
    {badge > 0 && (
      <Badge className="absolute -top-2 -left-2 h-5 w-5 md:h-6 md:w-6 p-0 flex items-center justify-center text-xs font-extrabold bg-gradient-to-br from-red-500 to-rose-600 text-white border-2 border-white dark:border-slate-900 shadow-lg animate-pulse">
        {badge}
      </Badge>
    )}
  </TabsTrigger>
);

const UserActivityCard = ({ user, rank, detailed }: any) => (
  <Card className="group hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
    <CardContent className="p-3">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg text-sm",
            rank === 1 && "bg-gradient-to-br from-yellow-400 to-orange-500",
            rank === 2 && "bg-gradient-to-br from-slate-300 to-slate-400",
            rank === 3 && "bg-gradient-to-br from-orange-400 to-orange-600",
            rank > 3 && "bg-gradient-to-br from-blue-500 to-indigo-600"
          )}>
            {rank <= 3 ? <Award className="h-5 w-5" /> : rank}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 dark:text-white truncate text-sm">
              {user.userName}
            </h3>
            {rank <= 3 && (
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
            {user.userEmail}
          </p>
          {detailed && (
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {user.readNotifications} مقروء
              </span>
              <span className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
                {user.totalNotifications} إجمالي
              </span>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-left">
          <div className="text-xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {user.readPercentage}%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {user.readNotifications}/{user.totalNotifications}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const NotificationCardEnhanced = ({ notification, onDelete, onView }: any) => {
  const priorityColors: any = {
    5: { bg: 'from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400' },
    4: { bg: 'from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400' },
    3: { bg: 'from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400' },
  };

  const config = priorityColors[notification.priority] || priorityColors[3];

  return (
    <Card className={cn(
      "group hover:shadow-xl transition-all duration-300 border-2 overflow-hidden",
      `bg-gradient-to-r ${config.bg}`,
      config.border
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
              notification.priority === 5 && "bg-gradient-to-br from-red-500 to-rose-600",
              notification.priority === 4 && "bg-gradient-to-br from-orange-500 to-amber-600",
              notification.priority === 3 && "bg-gradient-to-br from-blue-500 to-indigo-600"
            )}>
              <Bell className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {notification.title}
              </h3>
              <Badge variant="outline" className={cn("flex-shrink-0 text-xs", config.text, config.border)}>
                {notification.type}
              </Badge>
            </div>
            
            <p className="text-xs text-slate-700 dark:text-slate-300 mb-2 line-clamp-2">
              {notification.body}
            </p>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Clock className="h-3 w-3" />
                <span>{new Date(notification.createdAt).toLocaleDateString('ar-SA')}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onView}
                  className="h-7 px-2 hover:bg-white/50 dark:hover:bg-slate-800/50"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  className="h-7 px-2 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PerformanceMetric = ({ label, value, icon: Icon, color, bgColor }: any) => (
  <div className={cn("p-3 md:p-4 rounded-lg md:rounded-xl transition-all hover:shadow-md", bgColor)}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4 md:h-5 md:w-5", color)} />
        <span className="font-medium text-slate-700 dark:text-slate-300 text-xs md:text-sm">{label}</span>
      </div>
      <span className={cn("text-base md:text-lg font-black", color)}>{value}</span>
    </div>
  </div>
);

const CreateNotificationCard = ({ onRefetch }: any) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  return (
    <>
      <Card className="bg-gradient-to-br from-white to-blue-50 dark:from-slate-900 dark:to-blue-950/30 border-2 border-blue-200 dark:border-blue-800 shadow-xl">
        <CardHeader className="border-b border-blue-100 dark:border-blue-900 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 p-4 md:p-6">
          <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white text-base md:text-lg">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
              <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            إنشاء إشعار جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm md:text-base">
            قم بإنشاء إشعار جديد وإرساله للمستخدمين المحددين
          </p>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="w-full md:max-w-md h-10 md:h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold shadow-xl shadow-blue-500/30 text-sm md:text-base"
          >
            <Send className="h-4 w-4 ml-2" />
            فتح نموذج الإنشاء
          </Button>
        </CardContent>
      </Card>

      <CreateNotificationDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onRefetch={onRefetch} />
    </>
  );
};

const LoadingNotifications = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map(i => (
      <Card key={i} className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const LoadingUsers = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map(i => (
      <Skeleton key={i} className="h-20 w-full rounded-xl" />
    ))}
  </div>
);

const EmptyNotifications = () => (
  <Card className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
    <CardContent className="p-12">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
          <Bell className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
          لا توجد إشعارات
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
          ستظهر الإشعارات هنا عند إنشائها. يمكنك إنشاء إشعار جديد من التبويب المخصص.
        </p>
      </div>
    </CardContent>
  </Card>
);
