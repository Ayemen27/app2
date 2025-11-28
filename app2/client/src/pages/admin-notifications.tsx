import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { TrendingUp, Bell, Users, Zap, BarChart3, AlertCircle, CheckCircle2, Delete, Eye, Clock, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const { isAuthenticated, getAccessToken, isLoading: isAuthLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [filters, setFilters] = useState({ type: '', priority: '', search: '' });

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': getAccessToken() ? `Bearer ${getAccessToken()}` : '',
  });

  const { data: notificationsData, isLoading: isLoadingNotifications, refetch } = useQuery({
    queryKey: ['admin-notifications', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        requesterId: 'admin',
        limit: '50',
        ...(filters.type && { type: filters.type }),
        ...(filters.priority && { priority: filters.priority })
      });
      const response = await fetch(`/api/admin/notifications/all?${params}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل');
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
      if (!response.ok) throw new Error('فشل');
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
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-50" dir="rtl">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        
        {/* رأس الصفحة - متقن تماماً */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform">
              <Bell className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                لوحة الإشعارات
              </h1>
              <p className="text-gray-600 font-semibold">إدارة احترافية للإشعارات والمستخدمين • تحكم كامل</p>
            </div>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          {/* التبويبات - متقنة */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-2 border-2 border-indigo-200 shadow-lg hover:shadow-xl transition-shadow">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 p-1 rounded-xl">
              <TabsTrigger 
                value="overview"
                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xl text-gray-700 font-semibold transition-all"
              >
                <BarChart3 className="h-4 w-4 ml-2" />
                <span className="hidden sm:inline">لوحة</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notifications"
                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xl text-gray-700 font-semibold transition-all"
              >
                <Bell className="h-4 w-4 ml-2" />
                <span className="hidden sm:inline">إشعارات</span>
              </TabsTrigger>
              <TabsTrigger 
                value="users"
                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xl text-gray-700 font-semibold transition-all"
              >
                <Users className="h-4 w-4 ml-2" />
                <span className="hidden sm:inline">مستخدمين</span>
              </TabsTrigger>
              <TabsTrigger 
                value="create"
                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xl text-gray-700 font-semibold transition-all"
              >
                <Zap className="h-4 w-4 ml-2" />
                <span className="hidden sm:inline">إنشاء</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* لوحة التحكم */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* KPIs - بطاقات جميلة جداً */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                icon={Bell}
                label="إجمالي"
                value={stats.total}
                gradient="from-indigo-600 to-blue-600"
                trend="+12%"
              />
              <KPICard
                icon={AlertCircle}
                label="حرج"
                value={stats.critical}
                gradient="from-red-600 to-pink-600"
                highlight={stats.critical > 0}
              />
              <KPICard
                icon={CheckCircle2}
                label="معدل القراءة"
                value={`${stats.readRate}%`}
                gradient="from-emerald-600 to-teal-600"
              />
              <KPICard
                icon={Users}
                label="نشطين"
                value={activityData?.userStats?.length || 0}
                gradient="from-purple-600 to-indigo-600"
              />
            </div>

            {/* الإحصائيات والمستخدمين */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* أفضل المستخدمين */}
              <Card className="lg:col-span-2 bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 shadow-xl">
                <CardHeader className="border-b-2 border-blue-200">
                  <CardTitle className="flex items-center gap-2 text-indigo-700 font-black text-xl">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                    الأعلى نشاطاً
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {isLoadingActivity ? (
                    <LoadingState />
                  ) : (
                    activityData?.userStats?.slice(0, 5).map((user: any, i: number) => (
                      <UserActivityRow key={user.userId} user={user} rank={i + 1} />
                    ))
                  )}
                </CardContent>
              </Card>

              {/* الإحصائيات */}
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-xl">
                <CardHeader className="border-b-2 border-amber-200">
                  <CardTitle className="text-amber-700 font-black">الملخص</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <StatRow label="معدل الفتح" value={`${stats.readRate}%`} color="text-emerald-600" />
                  <StatRow label="غير مقروء" value={stats.unread} color="text-orange-600" />
                  <StatRow label="حرج" value={stats.critical} color={stats.critical > 0 ? "text-red-600" : "text-gray-400"} />
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg">
                    عرض التفاصيل
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* الإشعارات */}
          <TabsContent value="notifications" className="space-y-4 mt-0">
            <div className="flex gap-2 mb-4">
              <Button onClick={() => refetch()} className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold shadow-lg">
                🔄 تحديث
              </Button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {isLoadingNotifications ? (
                <LoadingState />
              ) : notifications.length === 0 ? (
                <EmptyState message="لا توجد إشعارات" />
              ) : (
                notifications.map((notif: any) => (
                  <NotificationCard
                    key={notif.id}
                    notification={notif}
                    onDelete={() => deleteMutation.mutate(notif.id)}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* المستخدمين */}
          <TabsContent value="users" className="mt-0">
            <Card className="bg-gradient-to-br from-white to-indigo-50 border-2 border-indigo-200 shadow-xl">
              <CardHeader className="border-b-2 border-indigo-200">
                <CardTitle className="flex items-center gap-2 text-indigo-700 font-black text-xl">
                  <Users className="h-6 w-6 text-indigo-600" />
                  نشاط المستخدمين
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3 max-h-[600px] overflow-y-auto">
                {isLoadingActivity ? (
                  <LoadingState />
                ) : (
                  activityData?.userStats?.map((user: any, i: number) => (
                    <UserActivityRow key={user.userId} user={user} rank={i + 1} detailed />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* الإنشاء */}
          <TabsContent value="create" className="mt-0">
            <Card className="bg-gradient-to-br from-white to-yellow-50 border-2 border-yellow-200 shadow-xl">
              <CardHeader className="border-b-2 border-yellow-200">
                <CardTitle className="flex items-center gap-2 text-yellow-700 font-black text-xl">
                  <Zap className="h-6 w-6 text-yellow-500" />
                  إشعار جديد
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 max-w-md">
                  <input placeholder="العنوان" className="w-full border-2 border-yellow-200 rounded-lg p-3 font-semibold text-gray-700 focus:border-yellow-400 focus:outline-none" />
                  <textarea placeholder="المحتوى" rows={4} className="w-full border-2 border-yellow-200 rounded-lg p-3 font-semibold text-gray-700 focus:border-yellow-400 focus:outline-none" />
                  <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold shadow-lg">
                    إرسال الآن
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// مكونات مساعدة
const KPICard = ({ icon: Icon, label, value, gradient, trend, highlight }: any) => (
  <Card className={`bg-gradient-to-br ${gradient} border-0 overflow-hidden cursor-pointer transform hover:scale-105 transition-all shadow-xl ${
    highlight ? 'ring-4 ring-red-300' : ''
  }`}>
    <CardContent className="p-6 relative">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-white/90 font-bold uppercase tracking-wider text-xs">{label}</p>
          <p className="text-white text-4xl font-black mt-2">{value}</p>
          {trend && <p className="text-white/80 text-xs font-semibold mt-1">{trend}</p>}
        </div>
        <Icon className="h-10 w-10 text-white/70" />
      </div>
    </CardContent>
  </Card>
);

const UserActivityRow = ({ user, rank, detailed }: any) => (
  <div className="bg-gradient-to-r from-indigo-100 to-blue-100 rounded-xl p-4 hover:shadow-lg transition-all border-l-4 border-indigo-600">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
          {rank}
        </div>
        <div className="min-w-0">
          <p className="text-indigo-900 font-bold">{user.userName}</p>
          <p className="text-indigo-600 text-xs">{user.userEmail}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-indigo-900 font-black text-lg">{user.readPercentage}%</p>
        <p className="text-indigo-600 text-xs">{user.readNotifications}/{user.totalNotifications}</p>
      </div>
    </div>
  </div>
);

const NotificationCard = ({ notification, onDelete }: any) => (
  <div className={`bg-gradient-to-r ${
    notification.priority === 5 ? 'from-red-100 to-pink-100 border-red-300' : 'from-blue-100 to-cyan-100 border-blue-300'
  } rounded-xl p-4 hover:shadow-lg transition-all border-2`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <p className="text-gray-900 font-bold text-lg">{notification.title}</p>
        <p className="text-gray-700 text-sm mt-1 line-clamp-2">{notification.body}</p>
        <div className="flex gap-2 mt-3">
          <Badge className={notification.priority === 5 ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'} variant="default">
            {notification.type}
          </Badge>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        className="text-red-600 hover:bg-red-100 text-xl"
      >
        🗑️
      </Button>
    </div>
  </div>
);

const StatRow = ({ label, value, color }: any) => (
  <div className="flex justify-between items-center py-3 border-b-2 border-amber-200">
    <span className="text-amber-700 font-semibold">{label}</span>
    <span className={`text-2xl font-black ${color}`}>{value}</span>
  </div>
);

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-300 border-t-indigo-600 mb-3" />
    <p className="text-indigo-600 font-semibold">جاري التحميل...</p>
  </div>
);

const EmptyState = ({ message }: any) => (
  <div className="flex flex-col items-center justify-center py-12 bg-gradient-to-b from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
    <Bell className="h-12 w-12 text-blue-300 mb-3" />
    <p className="text-blue-600 font-semibold">{message}</p>
  </div>
);
