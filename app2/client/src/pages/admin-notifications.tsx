import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Bell, BellRing, Clock, Delete, Edit, Eye, RefreshCw, Send, Settings, Shield, User, Users, TrendingUp, Activity, Zap, Target, Crown, UserCheck } from 'lucide-react';
import { safeFind, ensureArray } from '@/lib/array-utils';

// أنواع البيانات
interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  priority: number;
  recipients: string[] | null;
  projectId?: string;
  createdAt: string;
  readStates: Array<{
    userId: string;
    isRead: boolean;
    readAt?: string;
    actionTaken: boolean;
  }>;
  totalReads: number;
  totalUsers: number;
}

interface UserActivity {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  totalNotifications: number;
  readNotifications: number;
  unreadNotifications: number;
  lastActivity?: string;
  readPercentage: number;
}

// أولويات الإشعارات
const priorityLabels = {
  1: { label: 'معلومات', color: 'bg-blue-500' },
  2: { label: 'منخفض', color: 'bg-green-500' },
  3: { label: 'متوسط', color: 'bg-yellow-500' },
  4: { label: 'عالي', color: 'bg-orange-500' },
  5: { label: 'حرج', color: 'bg-red-500' }
};

// أنواع الإشعارات
const typeLabels = {
  'system': { label: 'نظام', icon: '⚙️' },
  'security': { label: 'أمني', icon: '🔒' },
  'error': { label: 'خطأ', icon: '❌' },
  'task': { label: 'مهمة', icon: '📋' },
  'payroll': { label: 'راتب', icon: '💰' },
  'announcement': { label: 'إعلان', icon: '📢' },
  'maintenance': { label: 'صيانة', icon: '🔧' },
  'warranty': { label: 'ضمان', icon: '🛡️' }
};

// دالة لتحديد أيقونة ولون الدور
const getRoleInfo = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'admin':
    case 'مدير':
    case 'مسؤول':
      return {
        icon: Crown,
        label: 'مدير',
        color: 'from-red-500 to-red-600',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    case 'manager':
    case 'مشرف':
      return {
        icon: Shield,
        label: 'مشرف',
        color: 'from-orange-500 to-orange-600',
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    case 'user':
    case 'مستخدم':
    case 'موظف':
    default:
      return {
        icon: UserCheck,
        label: 'مستخدم',
        color: 'from-blue-500 to-blue-600',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
  }
};

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [filters, setFilters] = useState({
    type: '',
    priority: '',
    limit: 50,
    offset: 0
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    body: '',
    type: 'announcement',
    priority: 3,
    recipients: 'all',
    specificUserId: '',
    projectId: ''
  });

  // جلب جميع الإشعارات للمسؤول
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
      
      const response = await fetch(`/api/admin/notifications/all?${params}`);
      if (!response.ok) throw new Error('فشل في جلب الإشعارات');
      return response.json();
    }
  });

  // جلب نشاط المستخدمين
  const { data: userActivityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['user-activity'],
    queryFn: async () => {
      const response = await fetch('/api/admin/notifications/user-activity?requesterId=admin');
      if (!response.ok) throw new Error('فشل في جلب نشاط المستخدمين');
      return response.json();
    }
  });

  // جلب قائمة المستخدمين مع أدوارهم
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users', 'with-roles'],
    queryFn: async () => {
      const response = await fetch('/api/users?includeRole=true');
      if (!response.ok) throw new Error('فشل في جلب المستخدمين');
      return response.json();
    },
  });

  // إرسال إشعار جديد
  const sendNotificationMutation = useMutation({
    mutationFn: async (notification: typeof newNotification) => {
      const requestBody = {
        ...notification,
        requesterId: 'admin',
        // إذا كان النوع specific، نرسل معرف المستخدم المحدد
        recipients: notification.recipients === 'specific' && notification.specificUserId
          ? [notification.specificUserId]
          : notification.recipients
      };
      
      const response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) throw new Error('فشل في إرسال الإشعار');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم إرسال الإشعار بنجاح', variant: 'default' });
      setIsCreateDialogOpen(false);
      setNewNotification({
        title: '',
        body: '',
        type: 'announcement',
        priority: 3,
        recipients: 'all',
        specificUserId: '',
        projectId: ''
      });
      refetchNotifications();
    },
    onError: () => {
      toast({ title: 'خطأ في إرسال الإشعار', variant: 'destructive' });
    }
  });

  // حذف إشعار
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/admin/notifications/${notificationId}?requesterId=admin`, {
        method: 'DELETE'
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

  // تغيير حالة الإشعار لمستخدم معين
  const updateStatusMutation = useMutation({
    mutationFn: async ({ notificationId, userId, isRead }: { notificationId: string; userId: string; isRead: boolean }) => {
      const response = await fetch(`/api/admin/notifications/${notificationId}/user/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead, requesterId: 'admin' })
      });
      if (!response.ok) throw new Error('فشل في تحديث الحالة');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم تحديث الحالة بنجاح', variant: 'default' });
      refetchNotifications();
    },
    onError: () => {
      toast({ title: 'خطأ في تحديث الحالة', variant: 'destructive' });
    }
  });

  // جلب اسم المستخدم من بياناته
  const getUserName = (userId: string) => {
    const user = safeFind(userActivityData?.userStats, (u: UserActivity) => u.userId === userId);
    return user?.userName || userId.slice(0, 8) + '...';
  };

  // مكون عرض بطاقة الإشعار المحسن
  const NotificationCard = ({ notification }: { notification: AdminNotification }) => {
    const typeInfo = typeLabels[notification.type as keyof typeof typeLabels] || { label: notification.type, icon: '📄' };
    const priorityInfo = priorityLabels[notification.priority as keyof typeof priorityLabels] || { label: 'غير محدد', color: 'bg-gray-500' };
    const readPercentage = Math.round((notification.totalReads / notification.totalUsers) * 100) || 0;

    return (
      <Card className="group hover:shadow-lg transition-all duration-300 ease-in-out border border-gray-100 hover:border-blue-200 bg-gradient-to-br from-white to-gray-50/30">
        <CardContent className="p-4">
          {/* الرأس العلوي المضغوط */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${priorityInfo.color} shadow-sm flex-shrink-0`}>
                <span className="text-sm">{typeInfo.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm truncate.5">{notification.title}</h3>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-gray-50">
                    {typeInfo.label}
                  </Badge>
                  <Badge className={`${priorityInfo.color} text-white text-xs px-1.5 py-0.5`}>
                    {priorityInfo.label}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteNotificationMutation.mutate(notification.id)}
                className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Delete className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* المحتوى */}
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{notification.body}</p>
          
          {/* إحصائيات مضغوطة */}
          <div className="bg-gray-50 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-gray-500">
                <Clock className="h-3 w-3" />
                {new Date(notification.createdAt).toLocaleString('ar', { 
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span className="flex items-center gap-1 text-gray-600 font-medium">
                <Users className="h-3 w-3" />
                {notification.totalReads}/{notification.totalUsers} ({readPercentage}%)
              </span>
            </div>
            
            {/* شريط التقدم */}
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  readPercentage >= 80 ? 'bg-green-500' :
                  readPercentage >= 60 ? 'bg-blue-500' :
                  readPercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${readPercentage}%` }}
              />
            </div>
          </div>

          {/* المستخدمين - عرض مضغوط */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700 flex items-center gap-1">
              <Activity className="h-3 w-3" />
              حالة المستخدمين:
            </div>
            <div className="max-h-20 overflow-y-auto space-y-1">
              {notification.readStates.slice(0, 3).map((state) => (
                <div key={state.userId} className="flex items-center justify-between py-1 px-2 bg-white rounded border">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                      userActivityData?.userStats?.find((u: UserActivity) => u.userId === state.userId)?.userRole === 'admin' 
                        ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}>
                      {getUserName(state.userId).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium truncate">{getUserName(state.userId)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {state.isRead ? (
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    ) : (
                      <div className="w-2 h-2 bg-gray-300 rounded-full" />
                    )}
                  </div>
                </div>
              ))}
              {notification.readStates.length > 3 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{notification.readStates.length - 3} مستخدم آخر
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // مكون نشاط المستخدمين المحسن
  const UserActivityCard = ({ activity }: { activity: UserActivity }) => {
    const getPerformanceColor = (percentage: number) => {
      if (percentage >= 80) return 'from-green-500 to-green-600';
      if (percentage >= 60) return 'from-blue-500 to-blue-600';
      if (percentage >= 40) return 'from-yellow-500 to-yellow-600';
      return 'from-red-500 to-red-600';
    };

    return (
      <Card className="group hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-blue-200 bg-gradient-to-r from-white to-gray-50/50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                activity.userRole === 'admin' 
                  ? 'bg-gradient-to-r from-red-500 to-red-600' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600'
              }`}>
                {activity.userRole === 'admin' ? (
                  <Shield className="h-4 w-4 text-white" />
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900 truncate">{activity.userName}</span>
                  <Badge 
                    variant={activity.userRole === 'admin' ? 'destructive' : 'secondary'} 
                    className="text-xs px-1.5 py-0.5"
                  >
                    {activity.userRole === 'admin' ? 'مسؤول' : 'مستخدم'}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 truncate">{activity.userEmail}</div>
                <div className="text-xs text-gray-400">
                  آخر نشاط: {activity.lastActivity ? new Date(activity.lastActivity).toLocaleString('ar', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'لا يوجد'}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <div className="text-xs text-gray-500">{activity.totalNotifications}</div>
                <Bell className="h-3 w-3 text-gray-400" />
              </div>
              <div className="flex items-center gap-1">
                <div className="text-xs font-medium text-green-600">{activity.readNotifications}</div>
                <div className="text-xs text-gray-400">/</div>
                <div className="text-xs text-gray-500">{activity.unreadNotifications}</div>
              </div>
              <div className={`text-xs font-bold bg-gradient-to-r ${getPerformanceColor(activity.readPercentage)} bg-clip-text text-transparent`}>
                {activity.readPercentage}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40" dir="rtl">
      <div className="container mx-auto p-3 sm:p-6 max-w-7xl">

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <div className="bg-white rounded-2xl p-2 shadow-lg border border-gray-100">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-1 rounded-xl">
              <TabsTrigger value="overview" className="flex items-center gap-2 text-sm p-3 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">لوحة التحكم</span>
                <span className="sm:hidden font-medium">عامة</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2 text-sm p-3 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">الإشعارات</span>
                <span className="sm:hidden font-medium">إشعارات</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2 text-sm p-3 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">المستخدمين</span>
                <span className="sm:hidden font-medium">مستخدمين</span>
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2 text-sm p-3 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">إرسال جديد</span>
                <span className="sm:hidden font-medium">إرسال</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* نظرة عامة محسنة */}
          <TabsContent value="overview" className="space-y-12 mt-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-600">إجمالي الإشعارات</p>
                      <p className="text-2xl font-bold text-blue-700">{notificationsData?.total || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-600">المستخدمين النشطين</p>
                      <p className="text-2xl font-bold text-green-700">{userActivityData?.userStats?.length || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-amber-600">معدل القراءة</p>
                      <p className="text-2xl font-bold text-amber-700">
                        {userActivityData?.userStats?.length > 0 
                          ? Math.round(userActivityData.userStats.reduce((acc: number, user: UserActivity) => acc + user.readPercentage, 0) / userActivityData.userStats.length)
                          : 0}%
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-red-600">الإشعارات الحرجة</p>
                      <p className="text-2xl font-bold text-red-700">
                        {notificationsData?.notifications?.filter((n: AdminNotification) => n.priority === 5).length || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl min-h-[600px]">
              <CardHeader className="px-6 py-2 border-b border-gray-100">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  آخر النشاطات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {userActivityData?.userStats?.slice(0, 5).map((activity: UserActivity) => (
                    <UserActivityCard key={activity.userId} activity={activity} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* إدارة الإشعارات */}
          <TabsContent value="notifications" className="space-y-10 mt-12">
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
              <CardHeader className="px-6 py-2 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">فلترة الإشعارات</CardTitle>
                  <Button
                    onClick={() => refetchNotifications()}
                    disabled={isLoadingNotifications}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    تحديث
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Select value={filters.type || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value === "all" ? "" : value }))}>
                    <SelectTrigger className="border-gray-300 focus:border-blue-500">
                      <SelectValue placeholder="نوع الإشعار" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      {Object.entries(typeLabels).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.icon} {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filters.priority || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value === "all" ? "" : value }))}>
                    <SelectTrigger className="border-gray-300 focus:border-blue-500">
                      <SelectValue placeholder="الأولوية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأولويات</SelectItem>
                      {Object.entries(priorityLabels).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    placeholder="عدد النتائج"
                    value={filters.limit}
                    onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) || 50 }))}
                    className="border-gray-300 focus:border-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2 min-h-[500px]">
              {isLoadingNotifications ? (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">جاري التحميل...</p>
                </div>
              ) : notificationsData?.notifications?.length > 0 ? (
                notificationsData.notifications.map((notification: AdminNotification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))
              ) : (
                <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                  <CardContent className="text-center py-12">
                    <Bell className="h-16 w-16 text-gray-400 mx-auto" />
                    <p className="text-gray-500 text-lg">لا توجد إشعارات</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* نشاط المستخدمين */}
          <TabsContent value="users" className="space-y-10 mt-12">
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl min-h-[700px]">
              <CardHeader className="px-6 py-2 border-b border-gray-100">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  نشاط المستخدمين مع الإشعارات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {isLoadingActivity ? (
                  <div className="text-center py-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">جاري التحميل...</p>
                  </div>
                ) : userActivityData?.userStats?.length > 0 ? (
                  <div className="space-y-2 max-h-[700px] min-h-[500px] overflow-y-auto">
                    {userActivityData.userStats.map((activity: UserActivity) => (
                      <UserActivityCard key={activity.userId} activity={activity} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <Users className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-gray-500">لا يوجد نشاط للمستخدمين</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* إرسال إشعار جديد */}
          <TabsContent value="create" className="space-y-10 mt-12">
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl min-h-[600px]">
              <CardHeader className="px-6 py-2 border-b border-gray-100">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  إنشاء إشعار جديد
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">نوع الإشعار</label>
                    <Select 
                      value={newNotification.type} 
                      onValueChange={(value) => setNewNotification(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(typeLabels).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <span>{value.icon}</span>
                              <span>{value.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">مستوى الأولوية</label>
                    <Select 
                      value={newNotification.priority.toString()} 
                      onValueChange={(value) => setNewNotification(prev => ({ ...prev, priority: parseInt(value) }))}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityLabels).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            <div className={`flex items-center gap-2 font-medium ${
                              key === '5' ? 'text-red-600' :
                              key === '4' ? 'text-orange-600' :
                              key === '3' ? 'text-yellow-600' :
                              key === '2' ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {value.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700">عنوان الإشعار</label>
                    <Input
                      value={newNotification.title}
                      onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="أدخل عنوان الإشعار"
                      className="border-gray-300 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700">المستقبلين</label>
                    <Select 
                      value={newNotification.recipients} 
                      onValueChange={(value) => setNewNotification(prev => ({ ...prev, recipients: value }))}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            جميع المستخدمين
                          </div>
                        </SelectItem>
                        <SelectItem value="admins">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            المسؤولين فقط
                          </div>
                        </SelectItem>
                        <SelectItem value="users">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            المستخدمين العاديين فقط
                          </div>
                        </SelectItem>
                        <SelectItem value="specific">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-purple-600" />
                            مستخدم محدد
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* قائمة اختيار المستخدم المحدد */}
                  {newNotification.recipients === 'specific' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700">اختر المستخدم</label>
                      <Select 
                        value={newNotification.specificUserId} 
                        onValueChange={(value) => setNewNotification(prev => ({ ...prev, specificUserId: value }))}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-blue-500">
                          <SelectValue placeholder="اختر المستخدم المحدد..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {isLoadingUsers ? (
                            <div className="p-3 text-center text-gray-500">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                              <span className="text-sm mt-2">جاري التحميل...</span>
                            </div>
                          ) : users.length > 0 ? (
                            users.map((user: any) => {
                              const roleInfo = getRoleInfo(user.role);
                              const RoleIcon = roleInfo.icon;
                              const displayName = user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user.name || 'بدون اسم';
                              
                              return (
                                <SelectItem 
                                  key={user.id} 
                                  value={user.id} 
                                  className="p-3 rounded-lg hover:bg-gray-50"
                                >
                                  <div className="flex items-center gap-3 w-full">
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${roleInfo.color} flex items-center justify-center shadow-sm`}>
                                      <RoleIcon className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900 truncate text-sm">
                                          {displayName}
                                        </span>
                                        <div className={`px-2 py-0.5 rounded-full ${roleInfo.bgColor} ${roleInfo.borderColor} border`}>
                                          <span className={`text-xs font-semibold ${roleInfo.textColor}`}>
                                            {roleInfo.label}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-xs text-gray-500 truncate">
                                        {user.email}
                                      </span>
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })
                          ) : (
                            <div className="p-3 text-center text-gray-500">
                              <span className="text-sm">لا توجد مستخدمون متاحون</span>
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">محتوى الإشعار</label>
                  <Textarea
                    value={newNotification.body}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, body: e.target.value }))}
                    placeholder="أدخل محتوى الإشعار التفصيلي..."
                    rows={4}
                    className="border-gray-300 focus:border-blue-500 resize-none"
                  />
                </div>

                <Button
                  onClick={() => sendNotificationMutation.mutate(newNotification)}
                  disabled={
                    !newNotification.title || 
                    !newNotification.body || 
                    (newNotification.recipients === 'specific' && !newNotification.specificUserId) ||
                    sendNotificationMutation.isPending
                  }
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {sendNotificationMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      جاري الإرسال...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      إرسال الإشعار
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}