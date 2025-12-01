import React from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { CardState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface ReportTemplate4Props {
  state?: CardState;
  data?: {
    title: string;
    date: string;
    time: string;
    sections: Array<{ title: string; items: string[] }>;
    notes?: string;
  };
  onAction?: (action: string) => void;
}

export function ReportTemplate4({
  state = 'normal',
  data = {
    title: 'ملخص يومي - تقرير العمليات',
    date: '2025-12-01',
    time: '03:30 PM',
    sections: [
      {
        title: '✅ المنجزات',
        items: ['إصلاح الأسقف', 'تثبيت الأبواب', 'طلاء الجدران'],
      },
      {
        title: '⏳ قيد الإنجاز',
        items: ['تمديد الكهرباء', 'تركيب السباكة'],
      },
    ],
    notes: 'جودة العمل ممتازة - لا توجد مشاكل',
  },
  onAction,
}: ReportTemplate4Props) {
  return (
    <div
      className={cn(
        "bg-white border-l-8 border-purple-600 p-6 rounded-lg shadow-md",
        "max-w-2xl w-full mx-auto",
        state === 'loading' && "animate-pulse opacity-75"
      )}
    >
      {/* Header with Date/Time */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">{data.title}</h2>
        <div className="flex gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {data.date}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {data.time}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4 mb-6">
        {data.sections.map((section, idx) => (
          <div key={idx} className="border-l-4 border-purple-300 pl-4">
            <h3 className="font-bold text-gray-800 mb-2">{section.title}</h3>
            <ul className="space-y-1">
              {section.items.map((item, itemIdx) => (
                <li key={itemIdx} className="text-gray-600 text-sm">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">{data.notes}</p>
        </div>
      )}
    </div>
  );
}

export const reportTemplate4Code = {
  html: `<div class="bg-white border-l-8 border-purple-600 p-6 rounded-lg">
  <h2 class="text-2xl font-bold mb-3">ملخص يومي - تقرير العمليات</h2>
  
  <div class="flex gap-6 text-sm text-gray-600 mb-6">
    <div class="flex items-center gap-2">
      📅 2025-12-01
    </div>
    <div class="flex items-center gap-2">
      🕐 03:30 PM
    </div>
  </div>
  
  <div class="space-y-4 mb-6">
    <div class="border-l-4 border-purple-300 pl-4">
      <h3 class="font-bold mb-2">✅ المنجزات</h3>
      <ul class="space-y-1">
        <li class="text-sm text-gray-600">• إصلاح الأسقف</li>
        <li class="text-sm text-gray-600">• تثبيت الأبواب</li>
        <li class="text-sm text-gray-600">• طلاء الجدران</li>
      </ul>
    </div>
    <div class="border-l-4 border-purple-300 pl-4">
      <h3 class="font-bold mb-2">⏳ قيد الإنجاز</h3>
      <ul class="space-y-1">
        <li class="text-sm text-gray-600">• تمديد الكهرباء</li>
        <li class="text-sm text-gray-600">• تركيب السباكة</li>
      </ul>
    </div>
  </div>
  
  <div class="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
    <p class="text-sm text-gray-700">جودة العمل ممتازة - لا توجد مشاكل</p>
  </div>
</div>`,
  tailwind: `bg-white border-l-8 border-purple-600 p-6 rounded-lg shadow-md
text-2xl font-bold text-gray-800 mb-3
flex gap-6 text-sm text-gray-600 mb-6
flex items-center gap-2
space-y-4 mb-6
border-l-4 border-purple-300 pl-4
font-bold text-gray-800 mb-2
space-y-1
text-sm text-gray-600
bg-blue-50 border-2 border-blue-200 rounded-lg p-4
w-5 h-5 text-blue-600 flex-shrink-0
text-sm text-gray-700`,
};
