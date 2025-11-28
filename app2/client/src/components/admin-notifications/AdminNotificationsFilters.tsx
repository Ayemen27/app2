import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';

interface FiltersProps {
  filters: {
    type: string;
    priority: string;
    limit: number;
  };
  onTypeChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const typeLabels: Record<string, { label: string; icon: string }> = {
  'system': { label: 'نظام', icon: '⚙️' },
  'security': { label: 'أمني', icon: '🔒' },
  'error': { label: 'خطأ', icon: '❌' },
  'task': { label: 'مهمة', icon: '📋' },
  'payroll': { label: 'راتب', icon: '💰' },
  'announcement': { label: 'إعلان', icon: '📢' },
  'maintenance': { label: 'صيانة', icon: '🔧' },
  'warranty': { label: 'ضمان', icon: '🛡️' }
};

const priorityLabels: Record<string, string> = {
  1: 'معلومات',
  2: 'منخفض',
  3: 'متوسط',
  4: 'عالي',
  5: 'حرج'
};

export const AdminNotificationsFilters: React.FC<FiltersProps> = ({
  filters,
  onTypeChange,
  onPriorityChange,
  onLimitChange,
  onRefresh,
  isLoading
}) => {
  return (
    <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-semibold">فلاتر متقدمة</CardTitle>
          <Button
            onClick={onRefresh}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* نوع الإشعار */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700">نوع الإشعار</label>
            <Select value={filters.type || "all"} onValueChange={onTypeChange}>
              <SelectTrigger className="h-9 sm:h-10">
                <SelectValue placeholder="اختر نوع الإشعار" />
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
          </div>

          {/* الأولوية */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700">الأولوية</label>
            <Select value={filters.priority || "all"} onValueChange={onPriorityChange}>
              <SelectTrigger className="h-9 sm:h-10">
                <SelectValue placeholder="اختر الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأولويات</SelectItem>
                {Object.entries(priorityLabels).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* عدد النتائج */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700">عدد النتائج</label>
            <Select value={filters.limit.toString()} onValueChange={(val) => onLimitChange(parseInt(val))}>
              <SelectTrigger className="h-9 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
