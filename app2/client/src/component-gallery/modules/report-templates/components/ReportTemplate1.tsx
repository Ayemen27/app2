import React from 'react';
import { Printer, Download, Share2 } from 'lucide-react';
import { CardState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface ReportTemplate1Props {
  state?: CardState;
  data?: {
    title: string;
    date: string;
    items: Array<{ label: string; value: string }>;
    total?: string;
  };
  onAction?: (action: string) => void;
}

export function ReportTemplate1({
  state = 'normal',
  data = {
    title: 'تقرير العمال اليومي',
    date: '2025-12-01',
    items: [
      { label: 'إجمالي العمال', value: '15' },
      { label: 'العمال النشطين', value: '12' },
      { label: 'إجمالي الأجور', value: '1,500 ريال' },
    ],
    total: '1,500 ريال',
  },
  onAction,
}: ReportTemplate1Props) {
  return (
    <div
      className={cn(
        "bg-white border-2 border-gray-300 p-6 rounded-lg shadow-sm",
        "max-w-2xl w-full mx-auto",
        state === 'loading' && "animate-pulse opacity-75"
      )}
    >
      {/* Report Header */}
      <div className="text-center mb-6 border-b-2 border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">{data.title}</h2>
        <p className="text-sm text-gray-500 mt-1">التاريخ: {data.date}</p>
      </div>

      {/* Report Content */}
      <div className="space-y-4 mb-6">
        {data.items.map((item, idx) => (
          <div key={idx} className="flex justify-between border-b border-gray-100 pb-3">
            <span className="font-semibold text-gray-700">{item.label}</span>
            <span className="text-gray-600">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Total Section */}
      {data.total && (
        <div className="bg-blue-50 border-t-2 border-blue-300 pt-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-gray-800">الإجمالي</span>
            <span className="text-2xl font-bold text-blue-600">{data.total}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center mt-6">
        <button
          onClick={() => onAction?.('print')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-4 h-4" />
          طباعة
        </button>
        <button
          onClick={() => onAction?.('download')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          تحميل
        </button>
        <button
          onClick={() => onAction?.('share')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          مشاركة
        </button>
      </div>
    </div>
  );
}

export const reportTemplate1Code = {
  html: `<div class="bg-white border-2 border-gray-300 p-6 rounded-lg">
  <div class="text-center mb-6 border-b-2 pb-4">
    <h2 class="text-2xl font-bold">تقرير العمال اليومي</h2>
    <p class="text-sm text-gray-500 mt-1">التاريخ: 2025-12-01</p>
  </div>
  
  <div class="space-y-4 mb-6">
    <div class="flex justify-between border-b pb-3">
      <span class="font-semibold">إجمالي العمال</span>
      <span>15</span>
    </div>
    <div class="flex justify-between border-b pb-3">
      <span class="font-semibold">العمال النشطين</span>
      <span>12</span>
    </div>
    <div class="flex justify-between border-b pb-3">
      <span class="font-semibold">إجمالي الأجور</span>
      <span>1,500 ريال</span>
    </div>
  </div>
  
  <div class="bg-blue-50 border-t-2 border-blue-300 pt-4">
    <div class="flex justify-between">
      <span class="text-lg font-bold">الإجمالي</span>
      <span class="text-2xl font-bold text-blue-600">1,500 ريال</span>
    </div>
  </div>
</div>`,
  tailwind: `bg-white border-2 border-gray-300 p-6 rounded-lg shadow-sm
text-center mb-6 border-b-2 border-gray-200 pb-4
text-2xl font-bold text-gray-800
text-sm text-gray-500 mt-1
space-y-4 mb-6
flex justify-between border-b border-gray-100 pb-3
font-semibold text-gray-700
text-gray-600
bg-blue-50 border-t-2 border-blue-300 pt-4
text-lg font-bold text-gray-800
text-2xl font-bold text-blue-600
flex gap-3 justify-center mt-6
px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`,
};
