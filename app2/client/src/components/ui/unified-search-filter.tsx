import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Search, Filter, X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  placeholder?: string;
  options: FilterOption[];
  defaultValue?: string;
}

export interface UnifiedSearchFilterProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onReset?: () => void;
  showResetButton?: boolean;
  className?: string;
  compact?: boolean;
  showActiveFilters?: boolean;
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
        return value && value !== 'all' && value !== filter?.defaultValue;
      })
      .map(([key, value]) => {
        const filter = filters.find(f => f.key === key);
        const option = filter?.options.find(o => o.value === value);
        return {
          key,
          filterLabel: filter?.label || key,
          valueLabel: option?.label || value,
        };
      });
  };

  const activeFilters = getActiveFilters();
  const activeFiltersCount = activeFilters.length;
  const hasActiveFilters = searchValue.length > 0 || activeFiltersCount > 0;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(e.target.value);
  }, [onSearchChange]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    onFilterChange?.(key, value);
    setIsFilterOpen(false);
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
    onFilterChange?.(key, filter?.defaultValue || 'all');
  }, [filters, onFilterChange]);

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
              className="w-72 p-4" 
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
                      <Select 
                        value={filterValues[filter.key] || filter.defaultValue || 'all'}
                        onValueChange={(value) => handleFilterChange(filter.key, value)}
                      >
                        <SelectTrigger id={filter.key} className="h-9">
                          <SelectValue placeholder={filter.placeholder || `اختر ${filter.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {filter.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

export function useUnifiedFilter<T extends Record<string, string>>(
  initialFilters: T,
  initialSearch: string = ''
) {
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [filterValues, setFilterValues] = useState<T>(initialFilters);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
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

export default UnifiedSearchFilter;
