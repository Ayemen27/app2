import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Loader } from 'lucide-react';
import { AdminNotificationCard } from './AdminNotificationCard';

interface NotificationListProps {
  notifications: any[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onView?: (id: string) => void;
}

export const AdminNotificationsList: React.FC<NotificationListProps> = ({
  notifications,
  isLoading,
  onDelete,
  onView
}) => {
  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-gray-500 text-sm">جاري تحميل الإشعارات...</p>
        </CardContent>
      </Card>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد إشعارات</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {notifications.map((notification) => (
        <AdminNotificationCard
          key={notification.id}
          notification={notification}
          onDelete={onDelete}
          onView={onView}
        />
      ))}
    </div>
  );
};
