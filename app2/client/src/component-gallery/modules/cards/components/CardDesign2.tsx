import React from 'react';
import { Receipt, Calendar, Building2, MoreVertical, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { CardState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface CardDesign2Props {
  state?: CardState;
  data?: {
    item: string;
    amount: number;
    date: string;
    vendor: string;
    category: string;
    type: 'income' | 'expense';
    status: 'paid' | 'pending' | 'overdue';
  };
  onAction?: (action: string) => void;
}

export function CardDesign2({
  state = 'normal',
  data = {
    item: 'شراء مواد بناء',
    amount: 2500,
    date: '2024-01-15',
    vendor: 'شركة المعدات',
    category: 'مواد',
    type: 'expense',
    status: 'paid',
  },
  onAction,
}: CardDesign2Props) {
  const statusColors = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    overdue: 'bg-red-100 text-red-700',
  };

  const statusLabels = {
    paid: 'مدفوع',
    pending: 'معلق',
    overdue: 'متأخر',
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <article
      className={cn(
        "bg-white rounded-xl border p-3 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        state === 'selected' && "ring-2 ring-primary bg-primary/5",
        state === 'disabled' && "opacity-50 pointer-events-none",
        state === 'loading' && "animate-pulse",
        state === 'hover' && "shadow-md -translate-y-0.5"
      )}
      role="listitem"
      aria-label={`مصروف: ${data.item}`}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          data.type === 'expense' ? "bg-red-100" : "bg-green-100"
        )}>
          {data.type === 'expense' ? (
            <ArrowUpRight className="w-5 h-5 text-red-600" />
          ) : (
            <ArrowDownLeft className="w-5 h-5 text-green-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-sm truncate">{data.item}</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {data.vendor}
                </span>
              </div>
            </div>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap",
              statusColors[data.status]
            )}>
              {statusLabels[data.status]}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(data.date)}
              </span>
              <span className="px-2 py-0.5 bg-muted rounded text-[10px]">{data.category}</span>
            </div>
            <span className={cn(
              "font-bold text-sm",
              data.type === 'expense' ? "text-red-600" : "text-green-600"
            )}>
              {data.type === 'expense' ? '-' : '+'}{formatCurrency(data.amount)}
            </span>
          </div>
        </div>

        <button
          onClick={() => onAction?.('menu')}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          aria-label="خيارات إضافية"
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </article>
  );
}

export const cardDesign2Code = {
  html: `<div class="bg-white rounded-xl border p-3 hover:shadow-md transition-all">
  <div class="flex items-start gap-3">
    <div class="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
      <svg class="w-5 h-5 text-red-600"><!-- ArrowUpRight --></svg>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h4 class="font-semibold text-sm truncate">شراء مواد بناء</h4>
          <div class="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <svg class="w-3 h-3"><!-- Building2 --></svg>
            <span>شركة المعدات</span>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">مدفوع</span>
      </div>
      <div class="flex items-center justify-between mt-2 pt-2 border-t">
        <div class="flex items-center gap-3">
          <span class="text-xs text-muted-foreground flex items-center gap-1">
            <svg class="w-3 h-3"><!-- Calendar --></svg>
            15 يناير
          </span>
          <span class="px-2 py-0.5 bg-muted rounded text-[10px]">مواد</span>
        </div>
        <span class="font-bold text-sm text-red-600">-2,500 ر.س</span>
      </div>
    </div>
    <button class="p-1.5 hover:bg-muted rounded-lg">
      <svg class="w-4 h-4"><!-- MoreVertical --></svg>
    </button>
  </div>
</div>`,
  tailwind: `// Expense Card - Design #2
<div className="bg-white rounded-xl border p-3 hover:shadow-md transition-all">
  <div className="flex items-start gap-3">
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center",
      type === 'expense' ? "bg-red-100" : "bg-green-100"
    )}>
      {type === 'expense' ? (
        <ArrowUpRight className="w-5 h-5 text-red-600" />
      ) : (
        <ArrowDownLeft className="w-5 h-5 text-green-600" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-sm">{item}</h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3" />
            {vendor}
          </div>
        </div>
        <span className={cn("px-2 py-0.5 rounded-full text-[10px]", statusColors[status])}>
          {statusLabels[status]}
        </span>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t">
        <span className="text-xs text-muted-foreground">{formatDate(date)}</span>
        <span className={cn("font-bold text-sm", type === 'expense' ? "text-red-600" : "text-green-600")}>
          {type === 'expense' ? '-' : '+'}{formatCurrency(amount)}
        </span>
      </div>
    </div>
  </div>
</div>`,
  react: `import { Receipt, Calendar, Building2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

function ExpenseCard({ data }) {
  return (
    <div className="bg-white rounded-xl border p-3 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-xl", data.type === 'expense' ? "bg-red-100" : "bg-green-100")}>
          {data.type === 'expense' ? <ArrowUpRight /> : <ArrowDownLeft />}
        </div>
        <div className="flex-1">
          <h4>{data.item}</h4>
          <div className="flex justify-between mt-2 pt-2 border-t">
            <span>{formatDate(data.date)}</span>
            <span className={cn(data.type === 'expense' ? "text-red-600" : "text-green-600")}>
              {formatCurrency(data.amount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}`,
};
