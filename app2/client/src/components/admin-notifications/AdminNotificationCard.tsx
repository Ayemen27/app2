import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, Delete, Eye, Activity } from 'lucide-react';

interface NotificationCardProps {
  notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    priority: number;
    createdAt: string;
    totalReads: number;
    totalUsers: number;
    readStates: Array<{
      userId: string;
      isRead: boolean;
      readAt?: string;
      actionTaken: boolean;
    }>;
  };
  onDelete: (id: string) => void;
  onView?: (id: string) => void;
}

const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'معلومات', color: 'bg-blue-500' },
  2: { label: 'منخفض', color: 'bg-green-500' },
  3: { label: 'متوسط', color: 'bg-yellow-500' },
  4: { label: 'عالي', color: 'bg-orange-500' },
  5: { label: 'حرج', color: 'bg-red-500' }
};

const typeLabels: Record<string, string> = {
  'system': '⚙️',
  'security': '🔒',
  'error': '❌',
  'task': '📋',
  'payroll': '💰',
  'announcement': '📢',
  'maintenance': '🔧',
  'warranty': '🛡️'
};

export const AdminNotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onDelete,
  onView
}) => {
  const priorityInfo = priorityLabels[notification.priority] || { label: 'غير محدد', color: 'bg-gray-500' };
  const typeIcon = typeLabels[notification.type] || '📄';
  const readPercentage = Math.round((notification.totalReads / notification.totalUsers) * 100) || 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-blue-200 bg-gradient-to-br from-white to-gray-50/30">
      <CardContent className="p-3 sm:p-4 space-y-3">
        {/* رأس البطاقة */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${priorityInfo.color} flex-shrink-0 text-lg`}>
              {typeIcon}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2">{notification.title}</h3>
              <div className="flex items-center gap-1 flex-wrap mt-1">
                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-gray-50">
                  {notification.type}
                </Badge>
                <Badge className={`${priorityInfo.color} text-white text-xs px-2 py-0.5`}>
                  {priorityInfo.label}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onView && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onView(notification.id)}
                className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(notification.id)}
              className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 transition-colors"
            >
              <Delete className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* المحتوى */}
        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">{notification.body}</p>

        {/* إحصائيات مع تقدم */}
        <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1 text-gray-600">
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
              {notification.totalReads}/{notification.totalUsers}
            </span>
          </div>

          {/* شريط التقدم */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                readPercentage >= 80 ? 'bg-green-500' :
                readPercentage >= 60 ? 'bg-blue-500' :
                readPercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${readPercentage}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 mt-1 block text-right">{readPercentage}%</span>
        </div>

        {/* عرض أول 3 مستخدمين */}
        {notification.readStates.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-gray-700 flex items-center gap-1">
              <Activity className="h-3 w-3" />
              حالة المستخدمين:
            </div>
            <div className="space-y-1 max-h-[100px] overflow-y-auto">
              {notification.readStates.slice(0, 3).map((state) => (
                <div key={state.userId} className="flex items-center justify-between py-1 px-2 bg-white rounded border border-gray-100">
                  <span className="text-xs font-medium text-gray-700 truncate">{state.userId.slice(0, 8)}</span>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${state.isRead ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              ))}
              {notification.readStates.length > 3 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{notification.readStates.length - 3} مستخدم
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
