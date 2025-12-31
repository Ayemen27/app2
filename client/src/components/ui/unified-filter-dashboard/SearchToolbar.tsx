import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Search, X, Filter, RefreshCw, RotateCcw, List, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterDatePicker, FilterDateRangePicker } from '@/components/ui/filter-date-pickers';
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
          <div onClick={(e) => e.stopPropagation()} className="relative">
            <FilterDatePicker
              value={value ? new Date(value) : undefined}
              onChange={(date) => {
                onFilterChange?.(filter.key, date);
                if (date) {
                  // الغاء حقل تاريخ من/إلى عند تحديد تاريخ يوم محدد
                  onFilterChange?.('dateRange', undefined);
                }
              }}
              placeholder={filter.placeholder}
              showClearButton={true}
              className="h-14 border-0 focus:ring-0 shadow-none bg-transparent px-4 text-right font-medium w-full"
            />
          </div>
        );
      
      case 'date-range':
        const fromValue = value?.from ? (value.from instanceof Date ? value.from : new Date(value.from)) : undefined;
        const toValue = value?.to ? (value.to instanceof Date ? value.to : new Date(value.to)) : undefined;
        return (
          <div onClick={(e) => e.stopPropagation()} className="space-y-6">
            <div className="relative group">
              <Label className="absolute -top-2.5 right-4 px-2 bg-white dark:bg-gray-950 text-xs font-medium text-muted-foreground z-10 transition-colors group-focus-within:text-primary">
                من تاريخ
              </Label>
              <div className="relative border-2 border-muted/50 rounded-2xl overflow-hidden transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5">
                <FilterDatePicker
                  value={fromValue}
                  onChange={(date) => {
                    const currentRange = (typeof value === 'object' && value !== null) ? { ...value } : {};
                    currentRange.from = date;
                    
                    if (date) {
                      // الغاء حقل تاريخ اليوم عند تحديد تاريخ من
                      onFilterChange?.('specificDate', undefined);
                    }
                    onFilterChange?.(filter.key, currentRange);
                  }}
                  placeholder="اختر التاريخ"
                  showClearButton={true}
                  className="h-14 border-0 focus:ring-0 shadow-none bg-transparent px-4 text-right font-medium w-full"
                />
              </div>
            </div>
            <div className="relative group">
              <Label className="absolute -top-2.5 right-4 px-2 bg-white dark:bg-gray-950 text-xs font-medium text-muted-foreground z-10 transition-colors group-focus-within:text-primary">
                إلى تاريخ
              </Label>
              <div className="relative border-2 border-muted/50 rounded-2xl overflow-hidden transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5">
                <FilterDatePicker
                  value={toValue}
                  onChange={(date) => {
                    const currentRange = (typeof value === 'object' && value !== null) ? { ...value } : {};
                    currentRange.to = date;
                    onFilterChange?.(filter.key, currentRange);
                  }}
                  placeholder="اختر التاريخ"
                  showClearButton={true}
                  className="h-14 border-0 focus:ring-0 shadow-none bg-transparent px-4 text-right font-medium w-full"
                />
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={String(value || filter.defaultValue || 'all')}
              onValueChange={(v) => {
                onFilterChange?.(filter.key, v);
                // Keep open for better UX in drawer
              }}
            >
              <SelectTrigger className="h-14 border-0 focus:ring-0 shadow-none bg-transparent px-4 text-right font-medium">
                <SelectValue placeholder={filter.placeholder || filter.label} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-2xl border-2">
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)} className="rounded-xl my-1 py-3 text-right">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

  const allActions = [...defaultActions, ...actions];

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
            className="h-[80vh] sm:h-[75vh] sm:max-w-2xl rounded-t-[2.5rem] p-0 overflow-hidden border-t-0 bg-white dark:bg-gray-950 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)]"
            dir="rtl"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <div className="flex flex-col h-full relative p-6">
              <div className="flex items-center justify-between mb-6">
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-muted transition-all">
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
                <SheetTitle className="text-lg font-bold text-center flex-1 mr-8">
                  اختر الفلتر
                </SheetTitle>
              </div>
              
              <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pb-32">
                <div className="space-y-6 max-w-xl mx-auto">
                  {filters.map((filter) => (
                    <div key={filter.key} className={cn(
                      "relative group",
                      filter.type === 'date-range' ? "pt-2" : ""
                    )}>
                      {filter.type !== 'date-range' && (
                        <Label 
                          className="absolute -top-2.5 right-4 px-2 bg-white dark:bg-gray-950 text-xs font-medium text-muted-foreground z-10 transition-colors group-focus-within:text-primary"
                        >
                          {filter.label}
                        </Label>
                      )}
                      <div className={cn(
                        filter.type !== 'date-range' && "relative border-2 border-muted/50 rounded-2xl overflow-hidden transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5"
                      )}>
                        {renderFilterInput(filter)}
                      </div>
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

              <div className="absolute bottom-6 left-6 right-6 z-40">
                <div className="max-w-xl mx-auto">
                  <Button 
                    className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-red-500/20 bg-[#e31e33] hover:bg-[#c41a2c] text-white transition-all active:scale-[0.98]"
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
                        'h-8 w-8 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200',
                        action.loading && 'bg-primary/10 text-primary',
                        action.variant === 'default' && 'bg-primary/10 text-primary'
                      )}
                      onClick={action.onClick}
                      disabled={action.disabled || action.loading}
                    >
                      <Icon className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        action.loading && 'animate-spin'
                      )} />
                    </Button>
                  </TooltipTrigger>
                  {action.tooltip && (
                    <TooltipContent side="bottom" className="text-xs">
                      <p>{action.loading ? 'جاري التحديث...' : action.tooltip}</p>
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
