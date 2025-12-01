import React from 'react';
import { Users, MapPin, Briefcase, CheckCircle } from 'lucide-react';
import { CardState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface ReportTemplate5Props {
  state?: CardState;
  data?: {
    title: string;
    projectName: string;
    location: string;
    teamSize: string;
    status: string;
    progress: number;
  };
  onAction?: (action: string) => void;
}

export function ReportTemplate5({
  state = 'normal',
  data = {
    title: 'تقرير حالة المشروع',
    projectName: 'أبار الجراحي - مرحلة الأساسات',
    location: 'الموقع: الرياض - الحي الشمالي',
    teamSize: '25 عامل',
    status: 'جارٍ العمل',
    progress: 65,
  },
  onAction,
}: ReportTemplate5Props) {
  return (
    <div
      className={cn(
        "bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8 rounded-lg shadow-xl",
        "max-w-2xl w-full mx-auto",
        state === 'loading' && "animate-pulse opacity-75"
      )}
    >
      {/* Main Title */}
      <div className="mb-8 border-b-2 border-slate-600 pb-4">
        <h2 className="text-3xl font-bold mb-2">{data.title}</h2>
        <p className="text-lg text-slate-300">{data.projectName}</p>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Location */}
        <div className="flex items-start gap-3">
          <MapPin className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
          <div>
            <p className="text-slate-400 text-sm">الموقع</p>
            <p className="text-white font-semibold">{data.location}</p>
          </div>
        </div>

        {/* Team */}
        <div className="flex items-start gap-3">
          <Users className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
          <div>
            <p className="text-slate-400 text-sm">فريق العمل</p>
            <p className="text-white font-semibold">{data.teamSize}</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
          <div>
            <p className="text-slate-400 text-sm">الحالة</p>
            <p className="text-white font-semibold">{data.status}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-start gap-3">
          <Briefcase className="w-6 h-6 text-purple-500 flex-shrink-0 mt-1" />
          <div>
            <p className="text-slate-400 text-sm">الإنجاز</p>
            <p className="text-white font-semibold">{data.progress}%</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-400 to-blue-600 h-full transition-all duration-500"
            style={{ width: `${data.progress}%` }}
          />
        </div>
        <p className="text-slate-400 text-xs mt-2 text-center">نسبة الإنجاز: {data.progress}%</p>
      </div>

      {/* Footer */}
      <div className="text-center text-slate-400 text-xs pt-4 border-t border-slate-700">
        تم إنشاء التقرير: {new Date().toLocaleDateString('ar-EG')} • النسخة 1.0
      </div>
    </div>
  );
}

export const reportTemplate5Code = {
  html: `<div class="bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8 rounded-lg">
  <div class="mb-8 border-b-2 border-slate-600 pb-4">
    <h2 class="text-3xl font-bold mb-2">تقرير حالة المشروع</h2>
    <p class="text-lg text-slate-300">أبار الجراحي - مرحلة الأساسات</p>
  </div>
  
  <div class="grid grid-cols-2 gap-6 mb-8">
    <div class="flex items-start gap-3">
      <span class="text-orange-500">📍</span>
      <div>
        <p class="text-slate-400 text-sm">الموقع</p>
        <p class="text-white font-semibold">الموقع: الرياض - الحي الشمالي</p>
      </div>
    </div>
    <div class="flex items-start gap-3">
      <span class="text-blue-500">👥</span>
      <div>
        <p class="text-slate-400 text-sm">فريق العمل</p>
        <p class="text-white font-semibold">25 عامل</p>
      </div>
    </div>
  </div>
  
  <div class="mb-8">
    <div class="bg-slate-700 rounded-full h-3 overflow-hidden">
      <div class="bg-gradient-to-r from-green-400 to-blue-600 h-full" style="width: 65%"></div>
    </div>
  </div>
</div>`,
  tailwind: `bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8 rounded-lg shadow-xl
text-3xl font-bold mb-2
text-lg text-slate-300
grid grid-cols-2 gap-6 mb-8
flex items-start gap-3
w-6 h-6 flex-shrink-0 mt-1
text-slate-400 text-sm
text-white font-semibold
mb-8
bg-slate-700 rounded-full h-3 overflow-hidden
bg-gradient-to-r from-green-400 to-blue-600 h-full transition-all duration-500
text-slate-400 text-xs mt-2`,
};
