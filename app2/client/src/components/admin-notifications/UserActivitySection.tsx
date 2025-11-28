import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, User, Bell, Loader } from 'lucide-react';

interface ActivitySectionProps {
  activities: any[];
  isLoading: boolean;
  detailed?: boolean;
}

export const UserActivitySection: React.FC<ActivitySectionProps> = ({
  activities,
  isLoading,
  detailed = false
}) => {
  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-gray-500 text-sm">جاري تحميل النشاطات...</p>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500">لا يوجد نشاط للمستخدمين</p>
        </CardContent>
      </Card>
    );
  }

  const ActivityCard = ({ activity }: { activity: any }) => {
    const isAdmin = activity.userRole === 'admin' || activity.userRole === 'مدير' || activity.userRole === 'مسؤول';
    const readPercentage = activity.readPercentage || 0;
    const bgColor = isAdmin
      ? 'from-red-500 to-red-600'
      : 'from-blue-500 to-blue-600';

    const getPerformanceColor = (percentage: number) => {
      if (percentage >= 80) return 'text-green-600 font-bold';
      if (percentage >= 60) return 'text-blue-600 font-bold';
      if (percentage >= 40) return 'text-yellow-600 font-bold';
      return 'text-red-600 font-bold';
    };

    return (
      <Card className="bg-white hover:shadow-md transition-all border border-gray-100 hover:border-blue-200">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-r ${bgColor} shadow-sm`}>
                {isAdmin ? (
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                ) : (
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm truncate">{activity.userName}</span>
                  <Badge
                    variant={isAdmin ? 'destructive' : 'secondary'}
                    className="text-xs px-1.5 py-0.5 flex-shrink-0"
                  >
                    {isAdmin ? 'مسؤول' : 'مستخدم'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 truncate">{activity.userEmail}</p>
                {detailed && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    آخر نشاط: {activity.lastActivity
                      ? new Date(activity.lastActivity).toLocaleString('ar', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'لا يوجد'
                    }
                  </p>
                )}
              </div>
            </div>

            {/* الإحصائيات */}
            <div className={`flex flex-col ${detailed ? 'items-end' : 'items-end'} gap-1 flex-shrink-0`}>
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-sm text-gray-600">{activity.totalNotifications}</span>
                <Bell className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
              </div>
              <div className="text-xs text-gray-600">
                <span className="font-medium text-green-600">{activity.readNotifications}</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="text-gray-500">{activity.unreadNotifications}</span>
              </div>
              <p className={`text-xs sm:text-sm ${getPerformanceColor(readPercentage)}`}>
                {readPercentage}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 border-b border-gray-100">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          {detailed ? 'جميع المستخدمين' : 'أنشط المستخدمين'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className={`space-y-2 sm:space-y-3 ${detailed ? 'max-h-[800px] overflow-y-auto' : 'max-h-[500px] overflow-y-auto'}`}>
          {activities.slice(0, detailed ? undefined : 5).map((activity) => (
            <ActivityCard key={activity.userId} activity={activity} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
