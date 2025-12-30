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
          <div onClick={(e) => e.stopPropagation()}>
            <FilterDatePicker
              value={value}
              onChange={(date) => {
                onFilterChange?.(filter.key, date);
                // Keep open for better UX in drawer
              }}
              placeholder={filter.placeholder}
              showClearButton={true}
            />
          </div>
        );
      
      case 'date-range':
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <FilterDateRangePicker
              value={value}
              onChange={(range) => {
                onFilterChange?.(filter.key, range);
                // Keep open for better UX in drawer
              }}
              showClearButton={true}
            />
          </div>
        );
      
      default:
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={value || filter.defaultValue || 'all'}
              onValueChange={(v) => {
                onFilterChange?.(filter.key, v);
                // Keep open for better UX in drawer
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={filter.placeholder || filter.label} />
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
            className="h-[85vh] sm:h-[80vh] sm:max-w-xl rounded-t-[2rem] p-0 overflow-hidden border-t-0 bg-background/95 backdrop-blur-xl"
            dir="rtl"
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted/30 rounded-full mb-4" />
            
            <SheetHeader className="px-6 pt-8 pb-4 text-right border-b bg-card/50">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Filter className="h-5 w-5 text-primary" />
                  </div>
                  <span>تخصيص النتائج</span>
                </SheetTitle>
              </div>
            </SheetHeader>
            
            <div className="px-6 py-4 space-y-8 overflow-y-auto max-h-[calc(85vh-160px)] custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filters.map((filter) => (
                  <div key={filter.key} className="space-y-3 group">
                    <Label className="text-sm font-bold text-foreground/80 group-hover:text-primary transition-colors flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                      {filter.label}
                    </Label>
                    <div className="pt-1 relative">
                      {renderFilterInput(filter)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent pt-10">
              <div className="flex items-center gap-3">
                <Button 
                  className="flex-[2] h-12 text-base font-bold rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all"
                  onClick={() => setIsFilterOpen(false)}
                >
                  تطبيق الفلاتر
                </Button>
                
                {activeFiltersCount > 0 && onReset && (
                  <Button 
                    variant="outline" 
                    onClick={onReset}
                    className="flex-1 h-12 rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive/30 transition-all"
                  >
                    <RotateCcw className="h-4 w-4 ml-2" />
                    إعادة تعيين
                  </Button>
                )}
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
