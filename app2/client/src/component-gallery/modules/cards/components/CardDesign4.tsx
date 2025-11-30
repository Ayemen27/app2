import React from 'react';
import { Package, AlertTriangle, MoreVertical, TrendingDown, TrendingUp } from 'lucide-react';
import { CardState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface CardDesign4Props {
  state?: CardState;
  data?: {
    sku: string;
    name: string;
    quantity: number;
    minStock: number;
    price: number;
    unit: string;
    category: string;
    trend: 'up' | 'down' | 'stable';
    image?: string;
  };
  onAction?: (action: string) => void;
}

export function CardDesign4({
  state = 'normal',
  data = {
    sku: 'MAT-001',
    name: 'أسمنت بورتلاند',
    quantity: 45,
    minStock: 50,
    price: 25,
    unit: 'كيس',
    category: 'مواد البناء',
    trend: 'down',
  },
  onAction,
}: CardDesign4Props) {
  const isLowStock = data.quantity <= data.minStock;
  const stockPercentage = Math.min((data.quantity / data.minStock) * 100, 100);

  return (
    <article
      className={cn(
        "bg-white rounded-xl border p-3 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        state === 'selected' && "ring-2 ring-primary bg-primary/5",
        state === 'disabled' && "opacity-50 pointer-events-none",
        state === 'loading' && "animate-pulse",
        state === 'hover' && "shadow-md -translate-y-0.5",
        isLowStock && "border-yellow-200 bg-yellow-50/50"
      )}
      role="listitem"
      aria-label={`منتج: ${data.name}`}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
          isLowStock ? "bg-yellow-100" : "bg-primary/10"
        )}>
          {data.image ? (
            <img src={data.image} alt={data.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <Package className={cn("w-6 h-6", isLowStock ? "text-yellow-600" : "text-primary")} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm truncate">{data.name}</h4>
                {isLowStock && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    مخزون منخفض
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{data.sku}</code>
                <span>•</span>
                <span>{data.category}</span>
              </div>
            </div>
            <button
              onClick={() => onAction?.('menu')}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-[10px] text-muted-foreground">الكمية</div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "font-bold text-sm",
                    isLowStock ? "text-yellow-600" : "text-foreground"
                  )}>
                    {data.quantity}
                  </span>
                  <span className="text-xs text-muted-foreground">{data.unit}</span>
                  {data.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                  {data.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">السعر</div>
                <div className="font-bold text-sm text-primary">{data.price} ر.س/{data.unit}</div>
              </div>
            </div>
            
            <div className="w-16">
              <div className="text-[10px] text-muted-foreground mb-1 text-left">المخزون</div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    stockPercentage < 50 ? "bg-yellow-500" : "bg-green-500"
                  )}
                  style={{ width: `${stockPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export const cardDesign4Code = {
  html: `<div class="bg-white rounded-xl border p-3 hover:shadow-md transition-all border-yellow-200 bg-yellow-50/50">
  <div class="flex items-start gap-3">
    <div class="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
      <svg class="w-6 h-6 text-yellow-600"><!-- Package --></svg>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="flex items-center gap-2">
            <h4 class="font-semibold text-sm">أسمنت بورتلاند</h4>
            <span class="flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-medium">
              <svg class="w-3 h-3"><!-- AlertTriangle --></svg>
              مخزون منخفض
            </span>
          </div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <code class="bg-muted px-1.5 py-0.5 rounded text-[10px]">MAT-001</code>
            <span>•</span>
            <span>مواد البناء</span>
          </div>
        </div>
        <button class="p-1.5 hover:bg-muted rounded-lg"><svg class="w-4 h-4"><!-- MoreVertical --></svg></button>
      </div>
      <div class="flex items-center justify-between mt-3 pt-3 border-t">
        <div class="flex items-center gap-4">
          <div>
            <div class="text-[10px] text-muted-foreground">الكمية</div>
            <div class="font-bold text-sm text-yellow-600">45 كيس</div>
          </div>
          <div>
            <div class="text-[10px] text-muted-foreground">السعر</div>
            <div class="font-bold text-sm text-primary">25 ر.س/كيس</div>
          </div>
        </div>
        <div class="w-16">
          <div class="h-1.5 bg-muted rounded-full overflow-hidden">
            <div class="h-full bg-yellow-500 rounded-full" style="width: 45%"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`,
  tailwind: `// Product/Material Card - Design #4
<div className={cn(
  "bg-white rounded-xl border p-3 hover:shadow-md transition-all",
  isLowStock && "border-yellow-200 bg-yellow-50/50"
)}>
  <div className="flex items-start gap-3">
    <div className={cn(
      "w-12 h-12 rounded-xl flex items-center justify-center",
      isLowStock ? "bg-yellow-100" : "bg-primary/10"
    )}>
      <Package className={cn("w-6 h-6", isLowStock ? "text-yellow-600" : "text-primary")} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-sm">{name}</h4>
        {isLowStock && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px]">
            <AlertTriangle className="w-3 h-3" />
            مخزون منخفض
          </span>
        )}
      </div>
      <code className="text-[10px]">{sku}</code>
      <div className="flex justify-between mt-3 pt-3 border-t">
        <div><span>{quantity}</span> {unit}</div>
        <div>{price} ر.س/{unit}</div>
      </div>
    </div>
  </div>
</div>`,
  react: `import { Package, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

function ProductCard({ data }) {
  const isLowStock = data.quantity <= data.minStock;
  
  return (
    <div className={cn("bg-white rounded-xl border p-3", isLowStock && "border-yellow-200 bg-yellow-50/50")}>
      <div className="flex items-start gap-3">
        <Package className={isLowStock ? "text-yellow-600" : "text-primary"} />
        <div>
          <h4>{data.name}</h4>
          {isLowStock && <span>مخزون منخفض</span>}
          <div className="flex justify-between mt-3 pt-3 border-t">
            <span>{data.quantity} {data.unit}</span>
            <span>{data.price} ر.س</span>
          </div>
        </div>
      </div>
    </div>
  );
}`,
};
