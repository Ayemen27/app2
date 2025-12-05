import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Search, Filter, X, RotateCcw, SlidersHorizontal, Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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

function normalizeDate(date: Date | undefined): Date | undefined {
  if (!date) return undefined;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function DatePickerFilter({
  value,
  onChange,
  placeholder = 'اختر التاريخ',
}: {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-between text-right h-9 font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          {value ? format(value, 'yyyy/MM/dd', { locale: ar }) : placeholder}
          <Calendar className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={value}
          onSelect={(date) => {
            const normalizedDate = normalizeDate(date);
            onChange(normalizedDate);
            setOpen(false);
          }}
          locale={ar}
          dir="rtl"
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function DateRangeFilter({
  value,
  onChange,
}: {
  value?: { from?: Date; to?: Date };
  onChange: (range: { from?: Date; to?: Date }) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-between text-right h-9 font-normal',
            !value?.from && 'text-muted-foreground'
          )}
        >
          {value?.from ? (
            value.to ? (
              `${format(value.from, 'MM/dd', { locale: ar })} - ${format(value.to, 'MM/dd', { locale: ar })}`
            ) : (
              format(value.from, 'yyyy/MM/dd', { locale: ar })
            )
          ) : (
            'اختر نطاق التاريخ'
          )}
          <Calendar className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="range"
          selected={value?.from ? { from: value.from, to: value.to } : undefined}
          onSelect={(range: any) => {
            const normalizedRange = range ? {
              from: normalizeDate(range.from),
              to: normalizeDate(range.to)
            } : { from: undefined, to: undefined };
            onChange(normalizedRange);
            if (range?.to) setOpen(false);
          }}
          numberOfMonths={2}
          locale={ar}
          dir="rtl"
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
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
    const filter = filters.find(f => f.key === key);
    if (filter?.type !== 'date-range') {
      setIsFilterOpen(false);
    }
  }, [onFilterChange, filters]);

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
          <DatePickerFilter
            value={value}
            onChange={(date) => handleFilterChange(filter.key, date)}
            placeholder={filter.placeholder}
          />
        );
      
      case 'date-range':
        return (
          <DateRangeFilter
            value={value}
            onChange={(range) => handleFilterChange(filter.key, range)}
          />
        );
      
      case 'async-select':
        return (
          <AsyncSelectFilter
            config={filter}
            value={value || filter.defaultValue || 'all'}
            onChange={(val) => handleFilterChange(filter.key, val)}
          />
        );
      
      default:
        return (
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
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-9 gap-1.5 px-3 relative',
                  activeFiltersCount > 0 && 'border-primary text-primary'
                )}
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
            </PopoverTrigger>
            <PopoverContent 
              className="w-80 p-4" 
              align="end"
              sideOffset={8}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    خيارات الفلترة
                  </h4>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {activeFiltersCount} نشط
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-3">
                  {filters.map((filter) => (
                    <div key={filter.key} className="space-y-1.5">
                      <Label htmlFor={filter.key} className="text-sm text-muted-foreground">
                        {filter.label}
                      </Label>
                      {renderFilterInput(filter)}
                    </div>
                  ))}
                </div>

                {activeFiltersCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleReset}
                    className="w-full gap-2 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                    مسح جميع الفلاتر
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
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
