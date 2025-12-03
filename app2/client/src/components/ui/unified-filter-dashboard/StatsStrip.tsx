import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { StatsRowConfig, StatItem } from './types';
import { colorVariants } from './types';

interface StatsStripProps {
  rows: StatsRowConfig[];
  className?: string;
}

function StatCard({ item }: { item: StatItem }) {
  const colors = colorVariants[item.color] || colorVariants.blue;
  const Icon = item.icon;

  const cleanValue = (value: string | number): string => {
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) return '0';
      if (Math.abs(value) > 100000000000) return '0';
      return item.formatter ? item.formatter(value) : value.toLocaleString('en-US');
    }
    return String(value);
  };

  const formattedValue = cleanValue(item.value);

  const getValueSizeClass = (text: string) => {
    const len = text.length;
    if (len <= 3) return 'text-xl';
    if (len <= 5) return 'text-lg';
    if (len <= 8) return 'text-base';
    if (len <= 12) return 'text-sm';
    return 'text-xs';
  };

  return (
    <div
      className={cn(
        'relative flex flex-col p-3 rounded-xl border transition-all',
        colors.bg,
        colors.border,
        'hover:shadow-sm',
        item.onClick && 'cursor-pointer'
      )}
      onClick={item.onClick}
    >
      <div className="absolute top-2 left-2 p-1 rounded-md bg-white/50 dark:bg-black/20">
        <Icon className={cn('h-3.5 w-3.5', colors.icon)} />
      </div>

      {item.showDot && (
        <div className={cn(
          'absolute top-2 right-2 h-2.5 w-2.5 rounded-full',
          item.dotColor || 'bg-green-500'
        )} />
      )}

      <div className="flex flex-col items-center justify-center text-center min-h-[60px] pt-2">
        <span className={cn(
          'font-bold arabic-numbers leading-tight',
          getValueSizeClass(formattedValue),
          colors.text
        )}>
          {formattedValue}
        </span>

        {item.unit && (
          <span className="text-[10px] text-muted-foreground mt-0.5">{item.unit}</span>
        )}

        <span className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
          {item.label}
        </span>

        {item.subLabel && (
          <span className="text-[10px] text-muted-foreground/70 line-clamp-1">
            {item.subLabel}
          </span>
        )}

        {item.trend && (
          <span className={cn(
            'text-[10px] flex items-center gap-0.5 mt-1',
            item.trend.isPositive ? 'text-green-500' : 'text-red-500'
          )}>
            {item.trend.isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {item.trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}

export function StatsStrip({ rows, className }: StatsStripProps) {
  if (!rows || rows.length === 0) return null;

  const getGridCols = (cols: number = 3) => {
    switch (cols) {
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      case 5: return 'grid-cols-5';
      case 6: return 'grid-cols-6';
      default: return 'grid-cols-3';
    }
  };

  const getGapClass = (gap: 'sm' | 'md' | 'lg' = 'sm') => {
    switch (gap) {
      case 'sm': return 'gap-2';
      case 'md': return 'gap-3';
      case 'lg': return 'gap-4';
      default: return 'gap-2';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            'grid',
            getGridCols(row.columns),
            getGapClass(row.gap)
          )}
        >
          {row.items.map((item) => (
            <StatCard key={item.key} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default StatsStrip;
