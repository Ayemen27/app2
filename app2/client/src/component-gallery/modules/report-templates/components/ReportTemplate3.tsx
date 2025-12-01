import React from 'react';
import { DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import { CardState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface ReportTemplate3Props {
  state?: CardState;
  data?: {
    title: string;
    projectName: string;
    income: { value: string; change: string };
    expenses: { value: string; change: string };
    balance: { value: string; status: 'positive' | 'negative' };
  };
  onAction?: (action: string) => void;
}

export function ReportTemplate3({
  state = 'normal',
  data = {
    title: 'تقرير مالي - المشروع',
    projectName: 'أبار الجراحي',
    income: { value: '50,000 ريال', change: '+5,000' },
    expenses: { value: '35,000 ريال', change: '+2,000' },
    balance: { value: '15,000 ريال', status: 'positive' as const },
  },
  onAction,
}: ReportTemplate3Props) {
  const balanceColor = data.balance.status === 'positive' ? 'text-green-600' : 'text-red-600';
  const balanceBg = data.balance.status === 'positive' ? 'bg-green-50' : 'bg-red-50';

  return (
    <div
      className={cn(
        "bg-white border-4 border-yellow-400 p-8 rounded-lg shadow-lg",
        "max-w-2xl w-full mx-auto",
        state === 'loading' && "animate-pulse opacity-75"
      )}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">{data.title}</h2>
        <p className="text-lg text-gray-600 mt-2">🏗️ {data.projectName}</p>
      </div>

      {/* Financial Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* Income */}
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold text-gray-600">الدخل</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{data.income.value}</p>
          <p className="text-xs text-green-600 mt-1">الزيادة: {data.income.change}</p>
        </div>

        {/* Expenses */}
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown className="w-5 h-5 text-red-600" />
            <span className="text-sm font-semibold text-gray-600">النفقات</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{data.expenses.value}</p>
          <p className="text-xs text-red-600 mt-1">الزيادة: {data.expenses.change}</p>
        </div>

        {/* Balance */}
        <div className={cn('border-2 rounded-lg p-4', balanceBg, data.balance.status === 'positive' ? 'border-green-400' : 'border-red-400')}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5" style={{ color: data.balance.status === 'positive' ? '#16a34a' : '#dc2626' }} />
            <span className="text-sm font-semibold text-gray-600">الرصيد</span>
          </div>
          <p className={cn('text-2xl font-bold', balanceColor)}>{data.balance.value}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-100 rounded-lg p-4 text-center text-sm text-gray-600">
        <p>📋 ملخص مالي محدث • {new Date().toLocaleDateString('ar-EG')}</p>
      </div>
    </div>
  );
}

export const reportTemplate3Code = {
  html: `<div class="bg-white border-4 border-yellow-400 p-8 rounded-lg">
  <div class="text-center mb-8">
    <h2 class="text-3xl font-bold">تقرير مالي - المشروع</h2>
    <p class="text-lg text-gray-600 mt-2">أبار الجراحي</p>
  </div>
  
  <div class="grid grid-cols-3 gap-4 mb-8">
    <div class="bg-green-50 border-2 border-green-300 p-4 rounded-lg">
      <p class="text-sm font-semibold text-gray-600">الدخل</p>
      <p class="text-2xl font-bold text-green-600">50,000 ريال</p>
      <p class="text-xs text-green-600 mt-1">الزيادة: +5,000</p>
    </div>
    <div class="bg-red-50 border-2 border-red-300 p-4 rounded-lg">
      <p class="text-sm font-semibold text-gray-600">النفقات</p>
      <p class="text-2xl font-bold text-red-600">35,000 ريال</p>
      <p class="text-xs text-red-600 mt-1">الزيادة: +2,000</p>
    </div>
    <div class="bg-green-50 border-2 border-green-400 p-4 rounded-lg">
      <p class="text-sm font-semibold text-gray-600">الرصيد</p>
      <p class="text-2xl font-bold text-green-600">15,000 ريال</p>
    </div>
  </div>
</div>`,
  tailwind: `bg-white border-4 border-yellow-400 p-8 rounded-lg shadow-lg
text-center mb-8
text-3xl font-bold text-gray-800
text-lg text-gray-600 mt-2
grid grid-cols-3 gap-4 mb-8
bg-green-50 border-2 border-green-300 rounded-lg p-4
flex items-center gap-2 mb-2
text-sm font-semibold text-gray-600
text-2xl font-bold text-green-600
text-xs text-green-600 mt-1
bg-red-50 border-2 border-red-300
text-2xl font-bold text-red-600
text-xs text-red-600`,
};
