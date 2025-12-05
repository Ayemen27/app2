import React from 'react';
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Search, RefreshCw, X, LucideIcon } from "lucide-react";

export interface StatsItemConfig {
  key: string;
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'gray';
  showDot?: boolean;
  dotColor?: string;
}

export interface StatsRowConfig {
  columns?: number;
  gap?: 'sm' | 'md' | 'lg';
  items: StatsItemConfig[];
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'date' | 'date-range';
  defaultValue?: string;
  options?: FilterOption[];
}

export interface ResultsSummaryConfig {
  totalCount: number;
  filteredCount: number;
  totalLabel?: string;
  filteredLabel?: string;
}

export interface UnifiedFilterDashboardProps {
  statsRows?: StatsRowConfig[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  filters?: FilterConfig[];
  filterValues?: Record<string, any>;
  onFilterChange?: (key: string, value: any) => void;
  onReset?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  resultsSummary?: ResultsSummaryConfig;
  className?: string;
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  gray: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
};

export function UnifiedFilterDashboard({
  statsRows,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'بحث...',
  showSearch = true,
  filters = [],
  filterValues = {},
  onFilterChange,
  onReset,
  onRefresh,
  isRefreshing,
  resultsSummary,
  className,
}: UnifiedFilterDashboardProps) {
  const hasActiveFilters = filters.some(filter => {
    const value = filterValues[filter.key];
    return value && value !== 'all' && value !== filter.defaultValue;
  }) || Boolean(searchValue && searchValue.length > 0);

  return (
    <div className={cn('space-y-3', className)}>
      {statsRows && statsRows.length > 0 && (
        <div className="space-y-2">
          {statsRows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className={cn(
                'grid gap-2',
                row.columns === 2 && 'grid-cols-2',
                row.columns === 3 && 'grid-cols-3',
                row.columns === 4 && 'grid-cols-4',
                !row.columns && 'grid-cols-2'
              )}
            >
              {row.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className={cn(
                      'rounded-lg p-3 flex items-center gap-2',
                      colorClasses[item.color || 'gray']
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs opacity-80">{item.label}</p>
                      <p className="text-lg font-bold truncate">{item.value}</p>
                    </div>
                    {item.showDot && (
                      <span className={cn('w-2 h-2 rounded-full', item.dotColor || 'bg-current')} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {showSearch && (
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="pr-9"
            />
          </div>
        )}

        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <div key={filter.key} className="flex-1 min-w-[120px]">
                <Select
                  value={filterValues[filter.key] || filter.defaultValue || 'all'}
                  onValueChange={(value) => onFilterChange?.(filter.key, value)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            <div className="flex gap-1">
              {onRefresh && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                </Button>
              )}
              {hasActiveFilters && onReset && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onReset}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {resultsSummary && (
        <div className="text-sm text-muted-foreground text-center py-1">
          {resultsSummary.filteredLabel || 'عرض'} {resultsSummary.filteredCount} {resultsSummary.totalLabel || 'من'} {resultsSummary.totalCount}
        </div>
      )}
    </div>
  );
}

export default UnifiedFilterDashboard;
