import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { AdminNotificationsHeader } from '@/components/admin-notifications/AdminNotificationsHeader';
import { AdminNotificationsFilters } from '@/components/admin-notifications/AdminNotificationsFilters';
import { AdminNotificationsList } from '@/components/admin-notifications/AdminNotificationsList';
import { CreateNotificationForm } from '@/components/admin-notifications/CreateNotificationForm';
import { UserActivitySection } from '@/components/admin-notifications/UserActivitySection';
import { TrendingUp, Bell, Users, Zap } from 'lucide-react';

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, getAccessToken, isLoading: isAuthLoading } = useAuth();

  const [selectedTab, setSelectedTab] = useState('overview');
  const [filters, setFilters] = useState({
    type: '',
    priority: '',
    limit: 50,
    offset: 0
  });
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': getAccessToken() ? `Bearer ${getAccessToken()}` : '',
  });

  // جلب الإشعارات
  const { data: notificationsData, isLoading: isLoadingNotifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['admin-notifications', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        requesterId: 'admin',
        limit: filters.limit.toString(),
        offset: filters.offset.toString(),
        ...(filters.type && { type: filters.type }),
        ...(filters.priority && { priority: filters.priority })
      });

      const response = await fetch(`/api/admin/notifications/all?${params}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل في جلب الإشعارات');
      return response.json();
    },
    enabled: isAuthenticated && !isAuthLoading
  });

  // جلب نشاط المستخدمين
  const { data: userActivityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['user-activity'],
    queryFn: async () => {
      const response = await fetch('/api/admin/notifications/user-activity?requesterId=admin', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل في جلب نشاط المستخدمين');
      return response.json();
    },
    enabled: isAuthenticated && !isAuthLoading
  });

  // حذف إشعار
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/admin/notifications/${notificationId}?requesterId=admin`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل في حذف الإشعار');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم حذف الإشعار بنجاح', variant: 'default' });
      refetchNotifications();
    },
    onError: () => {
      toast({ title: 'خطأ في حذف الإشعار', variant: 'destructive' });
    }
  });

  // إرسال إشعار جديد
  const sendNotificationMutation = useMutation({
    mutationFn: async (notification: { title: string; body: string; type: string; priority: number; recipients: string; specificUserId?: string }) => {
      const response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...notification, requesterId: 'admin' })
      });
      if (!response.ok) throw new Error('فشل في إرسال الإشعار');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم إرسال الإشعار بنجاح', variant: 'default' });
      refetchNotifications();
    },
    onError: () => {
      toast({ title: 'خطأ في إرسال الإشعار', variant: 'destructive' });
    }
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? '' : value
    }));
  };

  const averageReadRate = userActivityData?.userStats?.length > 0
    ? Math.round(
        userActivityData.userStats.reduce((acc: number, user: any) => acc + user.readPercentage, 0) /
        userActivityData.userStats.length
      )
    : 0;

  const criticalCount = notificationsData?.notifications?.filter((n: any) => n.priority === 5).length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40" dir="rtl">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          {/* شريط التبويبات */}
          <div className="bg-white rounded-2xl p-2 sm:p-3 shadow-lg border border-gray-100 mb-6 sm:mb-8">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-1 sm:p-2 rounded-xl">
              <TabsTrigger value="overview" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 rounded-lg">
                <TrendingUp className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline font-medium">لوحة التحكم</span>
                <span className="sm:hidden font-medium text-xs">عامة</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 rounded-lg">
                <Bell className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline font-medium">الإشعارات</span>
                <span className="sm:hidden font-medium text-xs">إشعارات</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 rounded-lg">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline font-medium">المستخدمين</span>
                <span className="sm:hidden font-medium text-xs">مستخدمين</span>
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 rounded-lg">
                <Zap className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline font-medium">إرسال جديد</span>
                <span className="sm:hidden font-medium text-xs">إرسال</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* لوحة التحكم */}
          <TabsContent value="overview" className="space-y-6 sm:space-y-8 mt-0">
            <AdminNotificationsHeader
              totalNotifications={notificationsData?.total || 0}
              activeUsers={userActivityData?.userStats?.length || 0}
              averageReadRate={averageReadRate}
              criticalCount={criticalCount}
            />

            {/* أحدث الأنشطة */}
            <UserActivitySection
              activities={userActivityData?.userStats || []}
              isLoading={isLoadingActivity}
            />
          </TabsContent>

          {/* إدارة الإشعارات */}
          <TabsContent value="notifications" className="space-y-6 mt-0">
            <AdminNotificationsFilters
              filters={filters}
              onTypeChange={(value) => handleFilterChange('type', value)}
              onPriorityChange={(value) => handleFilterChange('priority', value)}
              onLimitChange={(value) => handleFilterChange('limit', value)}
              onRefresh={() => refetchNotifications()}
              isLoading={isLoadingNotifications}
            />

            <AdminNotificationsList
              notifications={notificationsData?.notifications || []}
              isLoading={isLoadingNotifications}
              onDelete={(id) => deleteNotificationMutation.mutate(id)}
              onView={setSelectedNotification}
            />
          </TabsContent>

          {/* نشاط المستخدمين */}
          <TabsContent value="users" className="space-y-6 mt-0">
            <UserActivitySection
              activities={userActivityData?.userStats || []}
              isLoading={isLoadingActivity}
              detailed={true}
            />
          </TabsContent>

          {/* إنشاء إشعار */}
          <TabsContent value="create" className="space-y-6 mt-0">
            <CreateNotificationForm
              onSubmit={(notification) => sendNotificationMutation.mutate(notification)}
              isLoading={sendNotificationMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* موديال التفاصيل */}
      {selectedNotification && (
        <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل الإشعار</DialogTitle>
            </DialogHeader>
            {/* سيتم إضافة محتوى التفاصيل هنا */}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
