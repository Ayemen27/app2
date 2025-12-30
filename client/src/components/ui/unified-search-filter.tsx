import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Search, Filter, X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { FilterDatePicker, FilterDateRangePicker, formatDateForDisplay, formatDateRangeForDisplay } from '@/components/ui/filter-date-pickers';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface FilterOption {
  value: string;
  label: string;
}

export type FilterType = 'select' | 'date' | 'date-range' | 'async-select';

export interface FilterConfig {
  key: string;
  label: string;
  type?: FilterType;
  placeholder?: string;
  options?: FilterOption[];
  defaultValue?: string;
  asyncOptions?: () => Promise<FilterOption[]>;
  loadingText?: string;
}

export interface UnifiedSearchFilterProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  filters?: FilterConfig[];
  filterValues?: Record<string, any>;
  onFilterChange?: (key: string, value: any) => void;
  onReset?: () => void;
  showResetButton?: boolean;
  className?: string;
  compact?: boolean;
  showActiveFilters?: boolean;
}

function AsyncSelectFilter({
  config,
  value,
  onChange,
}: {
  config: FilterConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  const [options, setOptions] = useState<FilterOption[]>(config.options || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (config.asyncOptions && options.length === 0) {
      setLoading(true);
      config.asyncOptions()
        .then(setOptions)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [config.asyncOptions]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={loading ? (config.loadingText || 'جاري التحميل...') : config.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function UnifiedSearchFilter({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'بحث...',
  showSearch = true,
  filters = [],
  filterValues = {},
  onFilterChange,
  onReset,
  showResetButton = true,
  className,
  compact = false,
  showActiveFilters = true,
}: UnifiedSearchFilterProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const getActiveFilters = () => {
    return Object.entries(filterValues)
      .filter(([key, value]) => {
        const filter = filters.find(f => f.key === key);
        if (!filter) return false;
        
        if (filter.type === 'date') {
          return value instanceof Date;
        }
        if (filter.type === 'date-range') {
          return value?.from || value?.to;
        }
        return value && value !== 'all' && value !== filter?.defaultValue;
      })
      .map(([key, value]) => {
        const filter = filters.find(f => f.key === key);
        let valueLabel = '';
        
        if (filter?.type === 'date' && value instanceof Date) {
          valueLabel = format(value, 'yyyy/MM/dd', { locale: ar });
        } else if (filter?.type === 'date-range') {
          if (value?.from && value?.to) {
            valueLabel = `${format(value.from, 'MM/dd')} - ${format(value.to, 'MM/dd')}`;
          } else if (value?.from) {
            valueLabel = `من ${format(value.from, 'MM/dd')}`;
          }
        } else {
          const option = filter?.options?.find(o => o.value === value);
          valueLabel = option?.label || value;
        }
        
        return {
          key,
          filterLabel: filter?.label || key,
          valueLabel,
        };
      });
  };

  const activeFilters = getActiveFilters();
  const activeFiltersCount = activeFilters.length;
  const hasActiveFilters = searchValue.length > 0 || activeFiltersCount > 0;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(e.target.value);
  }, [onSearchChange]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    onFilterChange?.(key, value);
    // Keep the drawer open for better multi-selection experience in the popup
    // Users can close it using the "Apply" button or clicking outside
  }, [onFilterChange]);

  const handleReset = useCallback(() => {
    onReset?.();
    setIsFilterOpen(false);
  }, [onReset]);

  const handleClearSearch = useCallback(() => {
    onSearchChange?.('');
  }, [onSearchChange]);

  const handleRemoveFilter = useCallback((key: string) => {
    const filter = filters.find(f => f.key === key);
    if (filter?.type === 'date' || filter?.type === 'date-range') {
      onFilterChange?.(key, undefined);
    } else {
      onFilterChange?.(key, filter?.defaultValue || 'all');
    }
  }, [filters, onFilterChange]);

  const renderFilterInput = (filter: FilterConfig) => {
    const value = filterValues[filter.key];
    
    switch (filter.type) {
      case 'date':
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <FilterDatePicker
              value={value}
              onChange={(date) => handleFilterChange(filter.key, date)}
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
              onChange={(range) => handleFilterChange(filter.key, range)}
              showClearButton={true}
            />
          </div>
        );
      
      case 'async-select':
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <AsyncSelectFilter
              config={filter}
              value={value || filter.defaultValue || 'all'}
              onChange={(val) => handleFilterChange(filter.key, val)}
            />
          </div>
        );
      
      default:
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select 
              value={value || filter.defaultValue || 'all'}
              onValueChange={(val) => handleFilterChange(filter.key, val)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={filter.placeholder || `اختر ${filter.label}`} />
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

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 p-2 bg-card border border-border/50 rounded-lg shadow-sm">
        {showSearch && (
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={handleSearchChange}
              className="pr-10 pl-8 h-9 bg-background"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="absolute left-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {filters.length > 0 && (
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-9 gap-1.5 px-3 relative',
                  activeFiltersCount > 0 && 'border-primary text-primary'
                )}
                data-testid="button-open-filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">فلترة</span>
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="default" 
                    className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full absolute -top-1.5 -left-1.5"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="bottom"
              className="h-[50vh] sm:h-[45vh] sm:max-w-xl rounded-t-[2rem] p-0 overflow-hidden border-t-0 bg-white dark:bg-gray-950 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)]"
              dir="rtl"
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-muted/30 rounded-full z-50" />
              
              <div className="flex flex-col h-full relative">
                <SheetHeader className="px-6 pt-6 pb-3 text-right border-b bg-white dark:bg-gray-900 sticky top-0 z-40">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={handleReset}
                      className="text-sm font-medium text-destructive hover:underline transition-all"
                    >
                      إعادة ضبط
                    </button>
                    <SheetTitle className="text-lg font-bold tracking-tight">
                      الفلاتر
                    </SheetTitle>
                    <SheetClose asChild>
                      <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-muted transition-all">
                        <X className="h-4 w-4" />
                      </Button>
                    </SheetClose>
                  </div>
                </SheetHeader>
                
                <div className="flex-1 px-6 py-4 space-y-5 overflow-y-auto custom-scrollbar pb-24 bg-white dark:bg-gray-950">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                    {filters.map((filter) => (
                      <div key={filter.key} className="space-y-4 group">
                        <Label htmlFor={filter.key} className="text-sm font-bold text-foreground/70 group-hover:text-primary transition-colors flex items-center gap-2.5 px-1">
                          <span className="w-2 h-2 rounded-full bg-primary/30 group-hover:bg-primary group-hover:scale-125 transition-all shadow-sm" />
                          {filter.label}
                        </Label>
                        <div className="relative transform transition-all focus-within:scale-[1.01]">
                          {renderFilterInput(filter)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5 bg-white dark:bg-gray-950 border-t border-border/50 z-40">
                  <div className="max-w-2xl mx-auto">
                    <Button 
                      className="w-full h-11 text-base font-bold rounded-xl shadow-md bg-primary text-primary-foreground"
                      onClick={() => setIsFilterOpen(false)}
                    >
                      تطبيق ({activeFiltersCount})
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {showResetButton && hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
            title="إعادة تعيين"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showActiveFilters && (activeFilters.length > 0 || searchValue) && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">الفلاتر النشطة:</span>
          
          {searchValue && (
            <Badge 
              variant="secondary" 
              className="gap-1 px-2 py-0.5 text-xs cursor-pointer hover:bg-destructive/20"
              onClick={handleClearSearch}
            >
              بحث: "{searchValue.length > 15 ? searchValue.substring(0, 15) + '...' : searchValue}"
              <X className="h-3 w-3" />
            </Badge>
          )}
          
          {activeFilters.map((filter) => (
            <Badge 
              key={filter.key}
              variant="secondary" 
              className="gap-1 px-2 py-0.5 text-xs cursor-pointer hover:bg-destructive/20"
              onClick={() => handleRemoveFilter(filter.key)}
            >
              {filter.filterLabel}: {filter.valueLabel}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          
          {(activeFilters.length > 1 || (activeFilters.length > 0 && searchValue)) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            >
              مسح الكل
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function useUnifiedFilter<T extends Record<string, any>>(
  initialFilters: T,
  initialSearch: string = ''
) {
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [filterValues, setFilterValues] = useState<T>(initialFilters);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setSearchValue('');
    setFilterValues(initialFilters);
  }, [initialFilters]);

  return {
    searchValue,
    filterValues,
    setSearchValue: handleSearchChange,
    setFilterValue: handleFilterChange,
    reset: handleReset,
    onSearchChange: handleSearchChange,
    onFilterChange: handleFilterChange,
    onReset: handleReset,
  };
}

export const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
];

export const EQUIPMENT_STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'active', label: 'نشط' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'out_of_service', label: 'خارج الخدمة' },
  { value: 'inactive', label: 'غير نشط' },
];

export const READ_STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'الكل' },
  { value: 'unread', label: 'غير مقروء' },
  { value: 'read', label: 'مقروء' },
];

export const PAYMENT_TYPE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع أنواع الدفع' },
  { value: 'cash', label: 'نقدي' },
  { value: 'credit', label: 'آجل' },
  { value: 'transfer', label: 'تحويل' },
];

export const TRANSFER_TYPE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الأنواع' },
  { value: 'incoming', label: 'وارد' },
  { value: 'outgoing', label: 'صادر' },
];

export const NOTIFICATION_TYPE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الأنواع' },
  { value: 'info', label: 'معلومات' },
  { value: 'warning', label: 'تحذير' },
  { value: 'error', label: 'خطأ' },
  { value: 'success', label: 'نجاح' },
];

export const PRIORITY_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الأولويات' },
  { value: 'high', label: 'عالية' },
  { value: 'medium', label: 'متوسطة' },
  { value: 'low', label: 'منخفضة' },
];

export const PROJECT_STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'active', label: 'نشط' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'paused', label: 'متوقف' },
];

export default UnifiedSearchFilter;
