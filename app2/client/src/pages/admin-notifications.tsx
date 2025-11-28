import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { TrendingUp, Bell, Users, Zap, BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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

  // حذف الإشعار
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        
        {/* رأس الصفحة */}
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">لوحة الإشعارات</h1>
              <p className="text-slate-400 text-sm sm:text-base">إدارة احترافية للإشعارات والمستخدمين</p>
            </div>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          {/* التبويبات */}
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-xl rounded-2xl p-1.5 border border-slate-700/50">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 bg-transparent p-0">
              <TabsTrigger 
                value="overview"
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-slate-300 transition-all duration-300"
              >
                <BarChart3 className="h-4 w-4 ml-2" />
                <span className="hidden sm:inline">لوحة التحكم</span>
                <span className="sm:hidden">عام</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notifications"
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-slate-300 transition-all duration-300"
              >
                <Bell className="h-4 w-4 ml-2" />
                <span className="hidden sm:inline">الإشعارات</span>
                <span className="sm:hidden">إشعارات</span>
              </TabsTrigger>
              <TabsTrigger 
                value="users"
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-slate-300 transition-all duration-300"
              >
                <Users className="h-4 w-4 ml-2" />
                <span className="hidden sm:inline">المستخدمين</span>
                <span className="sm:hidden">مستخدمين</span>
              </TabsTrigger>
              <TabsTrigger 
                value="create"
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-slate-300 transition-all duration-300"
              >
                <Zap className="h-4 w-4 ml-2" />
                <span className="hidden sm:inline">إنشاء</span>
                <span className="sm:hidden">جديد</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* لوحة التحكم الرئيسية */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <DashboardCard
                icon={Bell}
                label="إجمالي الإشعارات"
                value={stats.total}
                color="from-blue-600 to-cyan-600"
                trend="+12%"
              />
              <DashboardCard
                icon={AlertCircle}
                label="إشعارات حرجة"
                value={stats.critical}
                color="from-red-600 to-pink-600"
                highlight={stats.critical > 0}
              />
              <DashboardCard
                icon={CheckCircle2}
                label="معدل القراءة"
                value={`${stats.readRate}%`}
                color="from-green-600 to-emerald-600"
                trend={stats.readRate >= 80 ? '+5%' : '-2%'}
              />
              <DashboardCard
                icon={Users}
                label="المستخدمين النشطين"
                value={activityData?.userStats?.length || 0}
                color="from-purple-600 to-indigo-600"
              />
            </div>

            {/* النشاط والتحليلات */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* أفضل المستخدمين */}
              <Card className="lg:col-span-2 bg-gradient-to-br from-slate-800/50 to-slate-700/50 border-slate-700/50 overflow-hidden">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    أكثر المستخدمين نشاطاً
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {isLoadingActivity ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                    </div>
                  ) : activityData?.userStats?.slice(0, 5).map((user: any, i: number) => (
                    <UserRow key={user.userId} user={user} rank={i + 1} />
                  ))}
                </CardContent>
              </Card>

              {/* ملخص الأداء */}
              <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border-slate-700/50">
                <CardHeader className="border-b border-slate-700/50">
                  <CardTitle className="text-white">ملخص الأداء</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <StatItem label="معدل الفتح" value={`${stats.readRate}%`} color="text-green-400" />
                  <StatItem label="غير مقروء" value={stats.unread} color="text-orange-400" />
                  <StatItem label="حرج" value={stats.critical} color={stats.critical > 0 ? "text-red-400" : "text-slate-400"} />
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white mt-4">
                    عرض التفاصيل
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* قائمة الإشعارات */}
          <TabsContent value="notifications" className="space-y-4 mt-0">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input 
                placeholder="ابحث عن الإشعارات..." 
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
              <Button onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700 text-white">
                تحديث
              </Button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {isLoadingNotifications ? (
                <LoadingState />
              ) : notifications.length === 0 ? (
                <EmptyState message="لا توجد إشعارات" />
              ) : (
                notifications.map((notif: any) => (
                  <NotificationRow 
                    key={notif.id} 
                    notification={notif}
                    onDelete={() => deleteMutation.mutate(notif.id)}
                    onView={() => setSelectedNotification(notif.id)}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* المستخدمين */}
          <TabsContent value="users" className="mt-0">
            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border-slate-700/50">
              <CardHeader className="border-b border-slate-700/50">
                <CardTitle className="text-white">نشاط المستخدمين</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-2 max-h-[600px] overflow-y-auto">
                {isLoadingActivity ? (
                  <LoadingState />
                ) : activityData?.userStats?.map((user: any, i: number) => (
                  <UserRow key={user.userId} user={user} rank={i + 1} detailed />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* إنشاء إشعار */}
          <TabsContent value="create" className="mt-0">
            <CreateNotificationForm onRefetch={refetch} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// مكونات مساعدة
const DashboardCard = ({ icon: Icon, label, value, color, trend, highlight }: any) => (
  <Card className={`bg-gradient-to-br ${color} border-0 overflow-hidden group cursor-pointer transform hover:scale-105 transition-all duration-300 ${highlight ? 'ring-2 ring-red-400' : ''}`}>
    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    <CardContent className="p-6 relative z-10">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-white/80 text-sm font-semibold uppercase tracking-wider">{label}</p>
          <p className="text-white text-3xl font-black mt-2">{value}</p>
          {trend && <p className="text-white/70 text-xs mt-1">{trend}</p>}
        </div>
        <Icon className="h-8 w-8 text-white/60" />
      </div>
    </CardContent>
  </Card>
);

const UserRow = ({ user, rank, detailed }: any) => (
  <div className="bg-slate-700/30 rounded-lg p-3 sm:p-4 hover:bg-slate-700/50 transition-colors group">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {rank}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold truncate">{user.userName}</p>
          <p className="text-slate-400 text-xs truncate">{user.userEmail}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-white font-bold text-lg">{user.readPercentage}%</p>
        <p className="text-slate-400 text-xs">{user.readNotifications}/{user.totalNotifications}</p>
      </div>
    </div>
  </div>
);

const NotificationRow = ({ notification, onDelete, onView }: any) => (
  <div className="bg-slate-700/30 rounded-lg p-4 hover:bg-slate-700/50 transition-all group">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <p className="text-white font-semibold">{notification.title}</p>
        <p className="text-slate-400 text-sm mt-1 line-clamp-2">{notification.body}</p>
        <div className="flex gap-2 mt-2">
          <span className={`text-xs px-2 py-1 rounded-full ${
            notification.priority === 5 ? 'bg-red-600/30 text-red-200' : 'bg-blue-600/30 text-blue-200'
          }`}>
            {notification.type}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={onView} className="text-slate-400 hover:text-white">👁️</Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-slate-400 hover:text-red-400">🗑️</Button>
      </div>
    </div>
  </div>
);

const StatItem = ({ label, value, color }: any) => (
  <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
    <span className="text-slate-300 text-sm">{label}</span>
    <span className={`font-bold ${color}`}>{value}</span>
  </div>
);

const CreateNotificationForm = ({ onRefetch }: any) => (
  <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border-slate-700/50">
    <CardHeader className="border-b border-slate-700/50">
      <CardTitle className="text-white flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-500" />
        إنشاء إشعار جديد
      </CardTitle>
    </CardHeader>
    <CardContent className="p-6">
      <div className="space-y-4 max-w-md mx-auto">
        <Input placeholder="العنوان" className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500" />
        <textarea placeholder="المحتوى" rows={4} className="w-full bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 rounded-lg p-3 border" />
        <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
          إرسال الإشعار
        </Button>
      </div>
    </CardContent>
  </Card>
);

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent mb-3" />
    <p className="text-slate-400">جاري التحميل...</p>
  </div>
);

const EmptyState = ({ message }: any) => (
  <div className="flex flex-col items-center justify-center py-12">
    <Bell className="h-12 w-12 text-slate-600 mb-3" />
    <p className="text-slate-400">{message}</p>
  </div>
);
