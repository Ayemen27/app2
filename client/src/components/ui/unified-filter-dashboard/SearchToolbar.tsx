import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as SelectPrimitive from "@radix-ui/react-select";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Search, X, Filter, RefreshCw, RotateCcw, List, LayoutGrid, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterDatePicker, FilterDateRangePicker } from '@/components/ui/filter-date-pickers';
import { DatePickerField } from '@/components/ui/date-picker-field';
import type { ActionButton, FilterConfig } from './types';

interface SearchToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  actions?: ActionButton[];
  onReset?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  hasActiveFilters?: boolean;
  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
  showViewToggle?: boolean;
  className?: string;
  filters?: FilterConfig[];
  filterValues?: Record<string, any>;
  onFilterChange?: (key: string, value: any) => void;
}

export function SearchToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'البحث...',
  showSearch = true,
  actions = [],
  onReset,
  onRefresh,
  isRefreshing = false,
  hasActiveFilters = false,
  viewMode = 'grid',
  onViewModeChange,
  showViewToggle = false,
  className,
  filters = [],
  filterValues = {},
  onFilterChange,
}: SearchToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const handleClearSearch = useCallback(() => {
    onSearchChange?.('');
  }, [onSearchChange]);

  const getActiveFiltersCount = () => {
    return filters.filter(filter => {
      const value = filterValues[filter.key];
      if (filter.type === 'date') return value instanceof Date;
      if (filter.type === 'date-range') return value?.from || value?.to;
      if (filter.type === 'multi-select') return Array.isArray(value) && value.length > 0;
      return value && value !== 'all' && value !== filter.defaultValue;
    }).length;
  };

  const activeFiltersCount = getActiveFiltersCount();
  const showFilters = filters.length > 0 && onFilterChange;

  const renderFilterInput = (filter: FilterConfig) => {
    const value = filterValues[filter.key];
    
    switch (filter.type) {
      case 'date':
        return (
          <div onClick={(e) => e.stopPropagation()} className="relative group mb-2">
            <Label className="absolute -top-2.5 right-4 px-2 bg-white dark:bg-gray-950 text-[11px] font-bold text-slate-500 group-focus-within:text-primary z-20 transition-all">
              تاريخ محدد
            </Label>
            <div className="border-2 border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
              <DatePickerField
                value={value ? new Date(value) : undefined}
                onChange={(date) => {
                  onFilterChange?.(filter.key, date);
                  if (date) {
                    onFilterChange?.('dateRange', undefined);
                  }
                }}
                placeholder={filter.placeholder}
                className="h-14 border-0 bg-slate-50/30 dark:bg-slate-900/30 px-4 text-right text-sm w-full font-medium"
              />
            </div>
          </div>
        );
      
      case 'date-range':
        const fromValue = value?.from ? (value.from instanceof Date ? value.from : new Date(value.from)) : undefined;
        const toValue = value?.to ? (value.to instanceof Date ? value.to : new Date(value.to)) : undefined;
        return (
          <div onClick={(e) => e.stopPropagation()} className="grid grid-cols-2 gap-4 pt-2 mb-2">
            <div className="relative group">
              <Label className="absolute -top-2.5 right-4 px-2 bg-white dark:bg-gray-950 text-[11px] font-bold text-slate-500 group-focus-within:text-primary z-20 transition-all">
                من تاريخ
              </Label>
              <div className="border-2 border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                <DatePickerField
                  value={fromValue}
                  onChange={(date) => {
                    const currentRange = (typeof value === 'object' && value !== null) ? { ...value } : {};
                    currentRange.from = date;
                    if (date) onFilterChange?.('specificDate', undefined);
                    onFilterChange?.(filter.key, currentRange);
                  }}
                  placeholder="من"
                  className="h-14 border-0 bg-slate-50/30 dark:bg-slate-900/30 px-4 text-right text-sm w-full font-medium"
                />
              </div>
            </div>
            <div className="relative group">
              <Label className="absolute -top-2.5 right-4 px-2 bg-white dark:bg-gray-950 text-[11px] font-bold text-slate-500 group-focus-within:text-primary z-20 transition-all">
                إلى تاريخ
              </Label>
              <div className="border-2 border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                <DatePickerField
                  value={toValue}
                  onChange={(date) => {
                    const currentRange = (typeof value === 'object' && value !== null) ? { ...value } : {};
                    currentRange.to = date;
                    onFilterChange?.(filter.key, currentRange);
                  }}
                  placeholder="إلى"
                  className="h-14 border-0 bg-slate-50/30 dark:bg-slate-900/30 px-4 text-right text-sm w-full font-medium"
                />
              </div>
            </div>
          </div>
        );
      
      case 'multi-select': {
        const selectedValues: string[] = Array.isArray(value) ? value : [];
        const nonAllOptions = filter.options?.filter(o => o.value !== 'all') || [];
        const selectedLabels = nonAllOptions.filter(o => selectedValues.includes(o.value)).map(o => o.label);
        const displayText = selectedLabels.length === 0
          ? (filter.placeholder || filter.label)
          : selectedLabels.length <= 2
            ? selectedLabels.join('، ')
            : `${selectedLabels.length} محدد`;
        return (
          <div onClick={(e) => e.stopPropagation()} className="relative group mb-2">
            <Label className="absolute -top-2.5 right-4 px-2 bg-white dark:bg-gray-950 text-[11px] font-bold text-slate-500 z-20">
              {filter.label}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full h-14 border-2 border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-900/30 px-4 text-right text-sm font-medium flex items-center justify-between hover:border-primary/40 transition-all"
                  data-testid={`filter-multi-${filter.key}`}
                >
                  <svg className="h-4 w-4 opacity-50 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                  <span className={cn("truncate", selectedLabels.length === 0 && "text-muted-foreground")}>{displayText}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 rounded-2xl z-[99999]" align="start">
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {nonAllOptions.map((option) => {
                    const isChecked = selectedValues.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-sm text-right hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                          isChecked && "bg-primary/10 dark:bg-primary/20"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const newValues = isChecked
                              ? selectedValues.filter(v => v !== option.value)
                              : [...selectedValues, option.value];
                            onFilterChange?.(filter.key, newValues.length > 0 ? newValues : []);
                          }}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <span className="flex-1 text-right">{option.label}</span>
                        {option.dotColor && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: option.dotColor }} />}
                      </label>
                    );
                  })}
                </div>
                {selectedValues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onFilterChange?.(filter.key, [])}
                    className="w-full mt-2 py-2 text-xs text-center text-muted-foreground hover:text-destructive rounded-xl hover:bg-destructive/10 transition-colors"
                  >
                    مسح الكل
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        );
      }

      default:
        return (
          <div onClick={(e) => e.stopPropagation()} className="relative group mb-2">
            <Label className="absolute -top-2.5 right-4 px-2 bg-white dark:bg-gray-950 text-[11px] font-bold text-slate-500 group-focus-within:text-primary z-20 transition-all">
              {filter.label}
            </Label>
            <div className="border-2 border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
              <SelectPrimitive.Root
                value={String(value || filter.defaultValue || 'all')}
                onValueChange={(v: any) => onFilterChange?.(filter.key, v)}
              >
                <SelectTrigger className="h-14 border-0 bg-slate-50/30 dark:bg-slate-900/30 px-4 text-right text-sm font-medium">
                  <SelectValue placeholder={filter.placeholder || filter.label} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800 z-[99999]">
                  {filter.options?.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)} className="rounded-xl my-1 py-3 text-right">
                      <span className="flex items-center gap-2">
                        {option.dotColor && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: option.dotColor }} />}
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPrimitive.Root>
            </div>
          </div>
        );
    }
  };

  const defaultActions: ActionButton[] = [];

  if (showViewToggle && onViewModeChange) {
    defaultActions.push({
      key: 'viewList',
      icon: List,
      tooltip: 'عرض قائمة',
      onClick: () => onViewModeChange('list'),
      variant: viewMode === 'list' ? 'default' : 'ghost',
    });
    defaultActions.push({
      key: 'viewGrid',
      icon: LayoutGrid,
      tooltip: 'عرض شبكة',
      onClick: () => onViewModeChange('grid'),
      variant: viewMode === 'grid' ? 'default' : 'ghost',
    });
  }

  if (onRefresh) {
    defaultActions.push({
      key: 'refresh',
      icon: RefreshCw,
      tooltip: 'تحديث',
      onClick: onRefresh,
      loading: isRefreshing,
    });
  }

  if (onReset && hasActiveFilters) {
    defaultActions.push({
      key: 'reset',
      icon: RotateCcw,
      tooltip: 'إعادة تعيين',
      onClick: onReset,
    });
  }

  const allActions = [...defaultActions, ...(Array.isArray(actions) ? actions : [])];

  return (
    <div 
      className={cn(
        'flex items-center gap-2 p-2 bg-gradient-to-l from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-xl',
        className
      )}
      dir="rtl"
    >
      {showSearch && (
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-9 pe-3 ps-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg text-sm text-right"
            dir="rtl"
          />
          {searchValue ? (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 z-10"
              onClick={handleClearSearch}
              type="button"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
            </Button>
          ) : (
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          )}
        </div>
      )}

      {showFilters && (
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-lg relative',
                activeFiltersCount > 0 
                  ? 'text-primary bg-primary/10' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <Badge 
                  className="absolute -top-1 -left-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-white"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="bottom"
            className="h-[85vh] sm:h-[80vh] sm:max-w-2xl rounded-t-[2.5rem] p-0 overflow-hidden border-t-0 bg-white dark:bg-gray-950 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)] z-[10001]"
            dir="rtl"
            onPointerDownOutside={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('.rdp') || target.closest('[role="listbox"]') || target.closest('[role="option"]') || target.closest('[data-radix-select-viewport]') || target.closest('.relative')) {
                e.preventDefault();
              }
            }}
            onInteractOutside={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('.rdp') || target.closest('[role="listbox"]') || target.closest('[role="option"]') || target.closest('[data-radix-select-viewport]')) {
                e.preventDefault();
              }
            }}
          >
            <div className="flex flex-col h-full relative p-6 pb-0">
              <div className="flex items-center justify-between mb-8 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                  <SheetTitle className="text-xl font-bold tracking-tight">
                    تصفية النتائج
                  </SheetTitle>
                </div>
                <div className="h-1.5 w-12 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
              
              <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar px-1 pb-32 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  {filters.map((filter) => (
                    <div key={filter.key} className={cn(
                      "animate-in fade-in slide-in-from-bottom-2 duration-300",
                      filter.type === 'date-range' && "sm:col-span-2"
                    )}>
                      {renderFilterInput(filter)}
                    </div>
                  ))}
                </div>

                {filters.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Filter className="w-12 h-12 mb-4 opacity-20" />
                    <p>لا توجد فلاتر متاحة حالياً</p>
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-gray-950 dark:via-gray-950/95 z-50">
                <div className="max-w-xl mx-auto">
                  <Button 
                    className="w-full h-14 text-lg font-bold rounded-2xl shadow-2xl shadow-primary/30 bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.98] border-none"
                    onClick={() => setIsFilterOpen(false)}
                  >
                    استمرار
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {allActions.length > 0 && (
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-1 ps-2 border-r border-gray-200 dark:border-gray-700 pe-2">
            {allActions.map((action) => {
              const Icon = action.icon;
              return (
                <Tooltip key={action.key}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={action.variant || 'ghost'}
                      size="icon"
                      className={cn(
                        'h-8 w-8 rounded-lg transition-all duration-200 relative overflow-hidden',
                        action.loading
                          ? 'bg-primary text-primary-foreground shadow-md scale-95 cursor-not-allowed'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                        action.variant === 'default' && !action.loading && 'bg-primary/10 text-primary'
                      )}
                      onClick={action.onClick}
                      disabled={action.disabled || action.loading}
                    >
                      {action.loading && (
                        <span className="absolute inset-0 rounded-lg animate-pulse bg-primary/20" />
                      )}
                      {action.loading
                        ? <Loader2 className="h-4 w-4 animate-spin relative z-10" />
                        : <Icon className="h-4 w-4 transition-transform duration-200" />
                      }
                    </Button>
                  </TooltipTrigger>
                  {action.tooltip && (
                    <TooltipContent side="bottom" className="text-xs">
                      <p>{action.loading ? 'جاري التصدير...' : action.tooltip}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}

export default SearchToolbar;
