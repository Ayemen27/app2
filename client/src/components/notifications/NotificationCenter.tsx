import { ENV } from "@/lib/env";
import React, { useState, useEffect } from "react";
import { Bell, X, CheckCircle, AlertTriangle, Info, MessageCircle, Zap, Clock, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { showSuccessToast, showErrorToast } from "@/utils/enhanced-toast";
import { getAccessToken, getFetchCredentials, getClientPlatformHeader, getAuthHeaders, isWebCookieMode, authFetch } from '@/lib/auth-token-store';
import { useAuth } from '@/components/AuthProvider';

interface Notification {
  id: string;
  type: 'safety' | 'task' | 'payroll' | 'announcement' | 'system';
  title: string;
  message: string;
  priority: number;
  createdAt: string;
  isRead?: boolean;
  actionRequired?: boolean;
}

interface NotificationCenterProps {
  className?: string;
}

const notificationIcons = {
  safety: AlertTriangle,
  task: CheckCircle,
  payroll: MessageCircle,
  announcement: Info,
  system: Bell,
};

const notificationColors = {
  safety: "text-red-600 bg-gradient-to-r from-red-50 to-red-100",
  task: "text-blue-600 bg-gradient-to-r from-blue-50 to-blue-100",
  payroll: "text-green-600 bg-gradient-to-r from-green-50 to-green-100",
  announcement: "text-purple-600 bg-gradient-to-r from-purple-50 to-purple-100",
  system: "text-gray-600 bg-gradient-to-r from-gray-50 to-gray-100",
};

const priorityLabels = {
  1: { label: "حرج", color: "bg-gradient-to-r from-red-500 to-red-600" },
  2: { label: "عالية", color: "bg-gradient-to-r from-orange-500 to-orange-600" },
  3: { label: "متوسطة", color: "bg-gradient-to-r from-yellow-500 to-yellow-600" },
  4: { label: "منخفضة", color: "bg-gradient-to-r from-blue-500 to-blue-600" },
  5: { label: "معلومة", color: "bg-gradient-to-r from-gray-500 to-gray-600" },
};

import { PushTestButton } from "@/components/push-test-button";

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const isAuthReady = (): boolean => {
    if (isWebCookieMode()) return isAuthenticated;
    const token = getAccessToken();
    return !!(token || Object.keys(getAuthHeaders()).length > 0);
  };

  // جلب الإشعارات من API
  const fetchNotifications = async () => {
    if (!isAuthReady()) {
      return;
    }
    setLoading(true);
    try {

      const response = await authFetch(ENV.getApiUrl('/api/notifications?limit=50'));

      if (response.ok) {
        const data = await response.json();

        // التعامل مع الشكل الجديد للاستجابة { success, data, unreadCount }
        const notificationsData = Array.isArray(data.data) ? data.data : (Array.isArray(data.notifications) ? data.notifications : (Array.isArray(data) ? data : []));
        const unreadCount = typeof data.unreadCount === 'number' ? data.unreadCount : (Array.isArray(notificationsData) ? notificationsData.filter((n: any) => n.status !== 'read').length : 0);

        if (Array.isArray(notificationsData)) {
          // تحويل البيانات للشكل المتوقع من NotificationCenter
          const transformedNotifications = notificationsData.map((n: any) => ({
            id: n.id,
            type: n.type || 'system',
            title: n.title,
            message: n.message || n.body,
            priority: n.priority === 'critical' || n.priority === 5 || n.priority === 1 ? 1 :
                      n.priority === 'high' || n.priority === 4 || n.priority === 2 ? 2 :
                      n.priority === 'medium' || n.priority === 3 ? 3 :
                      n.priority === 'low' || n.priority === 2 || n.priority === 4 ? 4 : 5,
            createdAt: n.createdAt || n.created_at,
            isRead: n.status === 'read' || n.isRead === true,
            actionRequired: n.actionRequired || false
          }));

          setNotifications(transformedNotifications);
          setUnreadCount(unreadCount);
        }
      } else {
        // استخدام بيانات تجريبية في حالة الفشل
        setNotifications([
          {
            id: 'system-welcome',
            type: 'system',
            title: 'مرحباً بك',
            message: 'مرحباً بك في نظام AXION SYSTEM',
            priority: 3,
            createdAt: new Date().toISOString(),
            isRead: false,
          }
        ]);
        setUnreadCount(1);
      }
    } catch (error) {
      console.error('[NotificationCenter] خطأ في جلب الإشعارات:', error);
    } finally {
      setLoading(false);
    }
  };

  // تعليم إشعار كمقروء
  const markAsRead = async (notificationId: string) => {
    try {
      if (!isAuthReady()) {
        showErrorToast("لا يمكنك تحديد الإشعارات كمقروءة بدون تسجيل الدخول.");
        return;
      }

      const response = await authFetch(ENV.getApiUrl(`/api/notifications/${notificationId}/read`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-nonce': crypto.randomUUID(),
          'x-request-timestamp': new Date().toISOString(),
        },
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        showSuccessToast("تم تحديد الإشعار كمقروء.");
      } else {
        showErrorToast("فشل في تحديد الإشعار كمقروء.");
      }
    } catch (error) {
      showErrorToast("حدث خطأ أثناء تحديد الإشعار كمقروء.");
    }
  };

  // مسح الإشعارات المشبوهة
  const bulkDeleteSuspicious = async () => {
    try {
      if (!isAuthReady()) return;

      const response = await authFetch(ENV.getApiUrl('/api/notifications/bulk-delete-suspicious'), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-request-nonce': crypto.randomUUID(),
          'x-request-timestamp': new Date().toISOString(),
        },
      });

      if (response.ok) {
        await fetchNotifications();
        showSuccessToast("تم حذف الإشعارات غير الطبيعية بنجاح.");
      } else {
        showErrorToast("فشل في عملية الحذف الجماعي.");
      }
    } catch (error) {
      showErrorToast("حدث خطأ أثناء الحذف.");
    }
  };

  // تعليم جميع الإشعارات كمقروءة
  const markAllAsRead = async () => {
    try {
      if (!isAuthReady()) {
        showErrorToast("لا يمكنك تحديد جميع الإشعارات كمقروءة بدون تسجيل الدخول.");
        return;
      }

      const response = await authFetch(ENV.getApiUrl('/api/notifications/mark-all-read'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-nonce': crypto.randomUUID(),
          'x-request-timestamp': new Date().toISOString(),
        },
      });

      if (response.ok) {
        // إعادة جلب البيانات من الخادم لضمان التزامن
        await fetchNotifications();
        showSuccessToast("تم تحديد جميع الإشعارات كمقروءة.");
      } else {
        showErrorToast("فشل في تحديد جميع الإشعارات كمقروءة.");
      }
    } catch (error) {
      showErrorToast("حدث خطأ أثناء تحديد جميع الإشعارات كمقروءة.");
    }
  };

  // جلب الإشعارات عند اكتمال المصادقة
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "غير محدد";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "غير محدد";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "الآن";
    const diffInMinutes = Math.floor(diffMs / (1000 * 60));
    const diffInHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return "الآن";
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    if (diffInDays < 30) return `منذ ${diffInDays} يوم`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "relative h-9 w-9 rounded-xl transition-all duration-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 overflow-visible",
            className
          )}
          data-testid="notification-bell"
        >
          <Bell className={cn(
            "h-4 w-4 transition-all duration-300",
            unreadCount > 0 ? "text-primary" : "text-slate-600 dark:text-slate-400"
          )} />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-2 -right-2 min-w-[20px] h-5 rounded-full px-1 text-[11px] flex items-center justify-center font-bold bg-red-500 text-white border-white dark:border-slate-900 border-2 shadow-md z-20 animate-pulse"
              data-testid="notification-badge"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 sm:w-96 p-0 border-0 shadow-2xl rounded-2xl bg-white dark:bg-slate-900" align="end" data-testid="notification-popover">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-t-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-base">الإشعارات</h3>
                <p className="text-xs text-blue-100">
                  {unreadCount > 0 ? `${unreadCount} إشعار جديد` : 'جميع الإشعارات مقروءة'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-white hover:bg-white/20 rounded-lg"
                onClick={() => { setIsOpen(false); setLocation('/settings?tab=notifications'); }}
                title="إعدادات الإشعارات"
              >
                <Settings className="h-3 w-3 ml-0.5" />
                <span className="hidden sm:inline">الإعدادات</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-white hover:bg-white/20 rounded-lg"
                onClick={async () => {
                  if (confirm("هل أنت متأكد من حذف الإشعارات المشبوهة؟")) {
                    await bulkDeleteSuspicious();
                  }
                }}
                title="حذف الإشعارات المشبوهة/الغريبة"
              >
                <Zap className="h-3 w-3 ml-0.5" />
                <span className="hidden sm:inline">تصفية</span>
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2 text-white hover:bg-white/20 rounded-lg"
                  onClick={markAllAsRead}
                  data-testid="mark-all-read-button"
                >
                  <CheckCircle className="h-3 w-3 ml-0.5" />
                  <span className="hidden sm:inline">تعليم الكل</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div className="text-sm text-gray-500">جاري التحميل...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
              <div className="text-sm font-medium text-gray-600">لا توجد إشعارات</div>
              <div className="text-xs text-gray-400">ستظهر إشعاراتك الجديدة هنا</div>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification, index) => {
                const Icon = notificationIcons[notification.type] || Bell;
                const colorClasses = notificationColors[notification.type] || notificationColors.system;
                const priority = priorityLabels[notification.priority as keyof typeof priorityLabels] || priorityLabels[3];

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group p-3 last:mb-0 rounded-xl cursor-pointer transition-all duration-300 border",
                      !notification.isRead
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 shadow-sm hover:shadow-md"
                        : "bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                    )}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                    data-testid={`notification-item-${index}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-300 group-hover:scale-105",
                        colorClasses
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={cn(
                            "text-sm leading-tight",
                            !notification.isRead ? "font-bold text-gray-900" : "font-medium text-gray-700"
                          )}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            )}
                            <Badge
                              className={cn(
                                "text-xs px-2 py-0.5 text-white font-medium",
                                priority.color
                              )}
                            >
                              {priority.label}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(notification.createdAt)}</span>
                          </div>

                          {notification.actionRequired && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                              <Zap className="h-3 w-3 mr-1" />
                              إجراء مطلوب
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <div className="border-t border-gray-100 p-3">
              <Button
                variant="ghost"
                className="w-full text-sm font-medium bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 border border-gray-200 hover:border-blue-200 transition-all duration-300 rounded-xl h-10"
                onClick={() => {
                  setIsOpen(false);
                  setLocation('/notifications');
                }}
                data-testid="view-all-notifications-button"
              >
                <User className="h-4 w-4 mr-2" />
                عرض جميع الإشعارات
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
