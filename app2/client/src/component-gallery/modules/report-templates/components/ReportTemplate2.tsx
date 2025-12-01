import React from 'react';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { CardState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface ReportTemplate2Props {
  state?: CardState;
  data?: {
    title: string;
    month: string;
    stats: Array<{ icon: React.ReactNode; label: string; value: string; trend: string }>;
  };
  onAction?: (action: string) => void;
}

export function ReportTemplate2({
  state = 'normal',
  data = {
    title: 'تقرير المشاريع الشهري',
    month: 'ديسمبر 2025',
    stats: [
      { icon: '📊', label: 'المشاريع النشطة', value: '5', trend: '+2' },
      { icon: '💰', label: 'الإنفاق الإجمالي', value: '45,000', trend: '+15%' },
      { icon: '👷', label: 'إجمالي العمال', value: '48', trend: '+8' },
      { icon: '✅', label: 'المشاريع المكتملة', value: '3', trend: '+1' },
    ],
  },
  onAction,
}: ReportTemplate2Props) {
  return (
    <div
      className={cn(
        "bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200 p-6 rounded-lg",
        "max-w-3xl w-full mx-auto",
        state === 'loading' && "animate-pulse opacity-75"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-indigo-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{data.title}</h2>
          <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
            <Calendar className="w-4 h-4" />
            {data.month}
          </div>
        </div>
        <BarChart3 className="w-8 h-8 text-indigo-600" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {data.stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white border border-indigo-100 p-4 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-2">{stat.icon}</div>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-gray-800">{stat.value}</span>
              <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-white border-t-2 border-indigo-200 pt-4 mt-4 text-xs text-gray-500 text-center">
        تم إنشاء التقرير بنجاح • آخر تحديث: اليوم
      </div>
    </div>
  );
}

export const reportTemplate2Code = {
  html: `<div class="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200 p-6 rounded-lg">
  <div class="flex items-center justify-between mb-6 pb-4 border-b-2">
    <div>
      <h2 class="text-2xl font-bold">تقرير المشاريع الشهري</h2>
      <p class="text-sm text-gray-600 mt-1">ديسمبر 2025</p>
    </div>
  </div>
  
  <div class="grid grid-cols-2 gap-4 mb-6">
    <div class="bg-white border p-4 rounded-lg">
      <div class="text-2xl mb-2">📊</div>
      <p class="text-sm text-gray-600">المشاريع النشطة</p>
      <div class="flex justify-between mt-2">
        <span class="text-xl font-bold">5</span>
        <span class="text-sm text-green-600">+2</span>
      </div>
    </div>
    <div class="bg-white border p-4 rounded-lg">
      <div class="text-2xl mb-2">💰</div>
      <p class="text-sm text-gray-600">الإنفاق الإجمالي</p>
      <div class="flex justify-between mt-2">
        <span class="text-xl font-bold">45,000</span>
        <span class="text-sm text-green-600">+15%</span>
      </div>
    </div>
  </div>
</div>`,
  tailwind: `bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200 p-6 rounded-lg
flex items-center justify-between mb-6 pb-4 border-b-2
text-2xl font-bold text-gray-800
flex items-center gap-1 text-sm text-gray-600 mt-1
w-8 h-8 text-indigo-600
grid grid-cols-2 gap-4 mb-6
bg-white border border-indigo-100 p-4 rounded-lg hover:shadow-md
text-2xl mb-2
text-sm text-gray-600 mb-1
flex items-center justify-between
text-xl font-bold text-gray-800
text-sm font-semibold text-green-600`,
};
