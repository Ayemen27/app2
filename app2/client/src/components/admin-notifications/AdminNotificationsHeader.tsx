import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Users, Target, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

interface HeaderProps {
  totalNotifications: number;
  activeUsers: number;
  averageReadRate: number;
  criticalCount: number;
}

export const AdminNotificationsHeader: React.FC<HeaderProps> = ({
  totalNotifications,
  activeUsers,
  averageReadRate,
  criticalCount
}) => {
  const KPICard = ({ icon: Icon, label, value, color }: any) => (
    <Card className={`bg-gradient-to-br ${color} border-0 hover:shadow-lg transition-all duration-300`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-medium opacity-80">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <KPICard
        icon={Bell}
        label="إجمالي الإشعارات"
        value={totalNotifications}
        color="from-blue-500 to-blue-600"
      />
      <KPICard
        icon={Users}
        label="المستخدمين النشطين"
        value={activeUsers}
        color="from-green-500 to-green-600"
      />
      <KPICard
        icon={Target}
        label="معدل القراءة"
        value={`${averageReadRate}%`}
        color="from-amber-500 to-amber-600"
      />
      <KPICard
        icon={AlertTriangle}
        label="إشعارات حرجة"
        value={criticalCount}
        color="from-red-500 to-red-600"
      />
    </div>
  );
};
